const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const ROOM_PREFIX = 'session:';
const MAX_CHAT_LENGTH = 2000;
const MAX_ROOM_PARTICIPANTS = 2;

const sessionEndTimers = new Map();
const roomStartTimes = new Map();
const roomEndTimes = new Map();
const roomStarting = new Set();

// Map<sessionId, Map<socketId, streamId>>
const roomScreenSharers = new Map();

function getRoomName(sessionId) {
  return `${ROOM_PREFIX}${sessionId}`;
}

function getUserId(user) {
  return user?.userId ?? user?.user_id ?? user?.id ?? null;
}

function getSocketUserId(socket) {
  return String(socket.data.userId);
}

function clearRoomTimer(sessionId) {
  const key = String(sessionId);
  const timer = sessionEndTimers.get(key);

  if (timer) {
    clearTimeout(timer);
    sessionEndTimers.delete(key);
  }
}

function getRoomSockets(io, sessionId) {
  const room = io.sockets.adapter.rooms.get(getRoomName(sessionId));

  if (!room) return [];

  return [...room]
    .map((socketId) => io.sockets.sockets.get(socketId))
    .filter(Boolean);
}

function clearRoomState(sessionId) {
  const key = String(sessionId);

  clearRoomTimer(key);
  roomStartTimes.delete(key);
  roomEndTimes.delete(key);
  roomStarting.delete(key);
  roomScreenSharers.delete(key);
}

function removeScreenSharer(sessionId, socketId) {
  const key = String(sessionId);
  const sharers = roomScreenSharers.get(key);

  if (!sharers) return null;

  const share = sharers.get(socketId) || null;

  sharers.delete(socketId);

  if (sharers.size === 0) {
    roomScreenSharers.delete(key);
  }

  return share;
}

function notifyScreenShareStopped(io, sessionId, socket, share = null) {
  const key = String(sessionId);

  io.to(getRoomName(key)).emit('session:screen-share-stopped', {
    sessionId: key,
    userId: socket.data.userId,
    fromSocketId: socket.id,
    streamId: share?.streamId || null,
    trackId: share?.trackId || null,
  });
}

async function checkSessionAccess(sessionId, userId) {
  const result = await pool.query(
    `
      SELECT
        s.id AS session_id,
        s.status,
        s.scheduled_at,
        s.duration_minutes,
        sr.requester_id,
        sr.recipient_id,
        own.full_name AS user_name,
        partner.full_name AS partner_name
      FROM public.sessions s
      JOIN public.swap_requests sr
        ON sr.id = s.swap_request_id
      JOIN public.users own
        ON own.id = $2
      JOIN public.users partner
        ON partner.id = CASE
          WHEN sr.requester_id = $2 THEN sr.recipient_id
          ELSE sr.requester_id
        END
      WHERE s.id = $1
        AND (
          sr.requester_id = $2
          OR sr.recipient_id = $2
        )
      LIMIT 1
    `,
    [sessionId, userId],
  );

  if (result.rows.length === 0) {
    return {
      allowed: false,
      code: 'SESSION_NOT_FOUND',
      message: 'Session not found or you are not a participant.',
    };
  }

  const session = result.rows[0];
  const status = String(session.status || '').toLowerCase();

  if (status === 'cancelled' || status === 'completed') {
    return {
      allowed: false,
      code: 'SESSION_UNAVAILABLE',
      message: `This session is ${status}.`,
    };
  }

  if (!session.scheduled_at || !session.duration_minutes) {
    return {
      allowed: false,
      code: 'SESSION_SCHEDULE_MISSING',
      message: 'This session does not have a valid schedule.',
    };
  }

  const scheduledAt = new Date(session.scheduled_at).getTime();

  if (!Number.isFinite(scheduledAt)) {
    return {
      allowed: false,
      code: 'SESSION_SCHEDULE_INVALID',
      message: 'The scheduled date is invalid.',
    };
  }

  if (Date.now() < scheduledAt) {
    return {
      allowed: false,
      code: 'SESSION_NOT_STARTED',
      message: 'You cannot enter the live room before the scheduled time.',
      scheduledAt: new Date(scheduledAt).toISOString(),
    };
  }

  return {
    allowed: true,
    session: {
      ...session,
      scheduledAt,
      durationMinutes: Number(session.duration_minutes),
    },
  };
}

async function finishSession(io, sessionId) {
  const key = String(sessionId);
  const roomName = getRoomName(key);

  clearRoomTimer(key);

  try {
    await pool.query(
      `
        UPDATE public.sessions
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = $1
          AND LOWER(status) = 'scheduled'
      `,
      [sessionId],
    );
  } catch (error) {
    console.error('Could not mark session completed:', error.message);
  }

  io.to(roomName).emit('session:ended', {
    sessionId: key,
    message: 'The session time has ended.',
  });

  for (const socket of getRoomSockets(io, key)) {
    socket.leave(roomName);
    delete socket.data.sessionId;
    delete socket.data.userName;
    delete socket.data.sessionRole;
  }

  clearRoomState(key);
}

function scheduleSessionEnd(io, sessionId, endsAt) {
  const key = String(sessionId);

  clearRoomTimer(key);

  const delay = Math.min(Math.max(0, endsAt - Date.now()), 2147483647);

  const timer = setTimeout(() => {
    finishSession(io, key).catch((error) => {
      console.error('Session end error:', error.message);
    });
  }, delay);

  sessionEndTimers.set(key, timer);
}

async function startRoomIfReady(io, sessionId) {
  const key = String(sessionId);

  if (roomStartTimes.has(key) || roomStarting.has(key)) return;

  const sockets = getRoomSockets(io, key);
  const participants = new Map();

  for (const socket of sockets) {
    if (socket.data.userId != null) {
      participants.set(String(socket.data.userId), socket);
    }
  }

  if (participants.size < MAX_ROOM_PARTICIPANTS) return;

  roomStarting.add(key);

  try {
    const firstSocket = [...participants.values()][0];
    const access = await checkSessionAccess(key, firstSocket.data.userId);

    if (!access.allowed) {
      io.to(getRoomName(key)).emit('session:blocked', {
        code: access.code,
        message: access.message,
      });

      for (const socket of getRoomSockets(io, key)) {
        socket.leave(getRoomName(key));
        delete socket.data.sessionId;
        delete socket.data.userName;
        delete socket.data.sessionRole;
      }

      clearRoomState(key);
      return;
    }

    const currentSockets = getRoomSockets(io, key);
    const currentParticipants = new Set(
      currentSockets.map((socket) => String(socket.data.userId)),
    );

    if (currentParticipants.size < MAX_ROOM_PARTICIPANTS) return;

    const startedAt = Date.now();
    const endsAt = startedAt + access.session.durationMinutes * 60 * 1000;

    roomStartTimes.set(key, startedAt);
    roomEndTimes.set(key, endsAt);

    scheduleSessionEnd(io, key, endsAt);

    io.to(getRoomName(key)).emit('session:started', {
      sessionId: key,
      startedAt,
      endsAt,
      durationMinutes: access.session.durationMinutes,
    });
  } catch (error) {
    console.error('Could not start session room:', error.message);

    io.to(getRoomName(key)).emit('session:error', {
      message: 'The server could not start this session. Please try again.',
    });
  } finally {
    roomStarting.delete(key);
  }
}

function getActiveRoom(io, socket, acknowledgement) {
  const reply =
    typeof acknowledgement === 'function' ? acknowledgement : () => {};

  const sessionId = socket.data.sessionId;

  if (!sessionId) {
    reply({
      success: false,
      message: 'You have not joined a session room.',
    });
    return false;
  }

  const key = String(sessionId);
  const endsAt = roomEndTimes.get(key);

  if (!roomStartTimes.has(key) || !endsAt) {
    reply({
      success: false,
      message: 'The session has not started yet.',
    });
    return false;
  }

  if (Date.now() >= endsAt) {
    finishSession(io, key).catch((error) => {
      console.error('Could not end expired session:', error.message);
    });

    reply({ success: false, message: 'The session has ended.' });
    return false;
  }

  if (!socket.rooms.has(getRoomName(key))) {
    reply({
      success: false,
      message: 'You are no longer in the session room.',
    });
    return false;
  }

  return true;
}

function forwardToTargetOrRoom(
  io,
  socket,
  eventName,
  payload,
  acknowledgement,
) {
  const reply =
    typeof acknowledgement === 'function' ? acknowledgement : () => {};

  if (!getActiveRoom(io, socket, reply)) return;

  const sessionId = String(socket.data.sessionId);
  const targetSocketId = payload.targetSocketId;

  const forwarded = {
    ...payload,
    sessionId,
    fromSocketId: socket.id,
    userId: socket.data.userId,
    userName: socket.data.userName || 'Participant',
  };

  delete forwarded.targetSocketId;

  if (targetSocketId) {
    const target = io.sockets.sockets.get(targetSocketId);

    if (
      !target ||
      String(target.data.sessionId) !== sessionId ||
      !target.rooms.has(getRoomName(sessionId))
    ) {
      reply({
        success: false,
        message: 'The target participant is not connected to this session.',
      });
      return;
    }

    target.emit(eventName, forwarded);
  } else {
    socket.to(getRoomName(sessionId)).emit(eventName, forwarded);
  }

  reply({ success: true });
}

function registerSessionSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = getUserId(decoded);

      if (userId == null) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = userId;
      next();
    } catch {
      next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('session:role-swap', (payload = {}, acknowledgement) => {
      const reply =
        typeof acknowledgement === 'function' ? acknowledgement : () => {};

      if (!getActiveRoom(io, socket, reply)) return;

      const role = String(payload.role || '')
        .trim()
        .toLowerCase();

      if (!['teacher', 'learner'].includes(role)) {
        reply({
          success: false,
          message: 'A valid role is required.',
        });
        return;
      }

      socket.data.sessionRole = role;

      const rolePayload = {
        sessionId: String(socket.data.sessionId),
        userId: socket.data.userId,
        role,
      };

      socket
        .to(getRoomName(socket.data.sessionId))
        .emit('session:role-swapped', rolePayload);

      reply({ success: true, role: rolePayload });
    });

    socket.on('session:join', async (payload = {}, acknowledgement) => {
      const reply =
        typeof acknowledgement === 'function' ? acknowledgement : () => {};

      try {
        const sessionId = Number(payload.sessionId);

        if (!Number.isInteger(sessionId) || sessionId <= 0) {
          reply({
            success: false,
            code: 'INVALID_SESSION_ID',
            message: 'A valid session ID is required.',
          });
          return;
        }

        const access = await checkSessionAccess(sessionId, socket.data.userId);

        if (!access.allowed) {
          reply({
            success: false,
            code: access.code,
            message: access.message,
            scheduledAt: access.scheduledAt,
          });
          return;
        }

        // Leave an old room cleanly if this socket changes sessions.
        if (socket.data.sessionId) {
          const oldId = String(socket.data.sessionId);
          const oldRoom = getRoomName(oldId);
          const oldShare = removeScreenSharer(oldId, socket.id);

          if (oldShare) {
            notifyScreenShareStopped(io, oldId, socket, oldShare);
          }

          socket.to(oldRoom).emit('session:participant-left', {
            userId: socket.data.userId,
            userName: socket.data.userName,
          });

          socket.leave(oldRoom);
          delete socket.data.sessionId;
          delete socket.data.userName;
          delete socket.data.sessionRole;

          await startRoomIfReady(io, oldId);
        }

        const key = String(sessionId);
        const roomName = getRoomName(key);
        const existingSockets = getRoomSockets(io, key);
        const distinctUsers = new Set(
          existingSockets.map((item) => String(item.data.userId)),
        );

        if (
          distinctUsers.size >= MAX_ROOM_PARTICIPANTS &&
          !distinctUsers.has(getSocketUserId(socket))
        ) {
          reply({
            success: false,
            code: 'ROOM_FULL',
            message: 'Both participant places are already occupied.',
          });
          return;
        }

        await socket.join(roomName);

        socket.data.sessionId = key;
        socket.data.userName = access.session.user_name || 'Participant';

        const otherSockets = getRoomSockets(io, key).filter(
          (item) => item.id !== socket.id,
        );

        const partnerSocket = otherSockets.find(
          (item) => String(item.data.userId) !== getSocketUserId(socket),
        );

        let partnerId = partnerSocket?.data.userId ?? null;
        let partnerName =
          partnerSocket?.data.userName ||
          access.session.partner_name ||
          'Skill-swap partner';

        reply({
          success: true,
          sessionId: key,
          userId: socket.data.userId,
          partnerId,
          userName: socket.data.userName,
          partnerName,
          scheduledAt: new Date(access.session.scheduledAt).toISOString(),
          started: roomStartTimes.has(key),
          startedAt: roomStartTimes.get(key) || null,
          endsAt: roomEndTimes.get(key) || null,
          durationMinutes: access.session.durationMinutes,
          partnerPresent: Boolean(partnerSocket),
        });

        // Notify a joining participant about existing screen sharers,
        // including the stream ID required to match the incoming WebRTC track.
        const sharers = roomScreenSharers.get(key);

        if (sharers) {
          for (const [sharerSocketId, share] of sharers.entries()) {
            if (sharerSocketId === socket.id) continue;

            const sharerSocket = io.sockets.sockets.get(sharerSocketId);

            if (sharerSocket) {
              socket.emit('session:screen-share-started', {
                sessionId: key,
                userId: sharerSocket.data.userId,
                userName: sharerSocket.data.userName || 'Participant',
                fromSocketId: sharerSocket.id,
                streamId: share.streamId,
                trackId: share.trackId,
              });
            }
          }
        }

        socket.to(roomName).emit('session:participant-joined', {
          userId: socket.data.userId,
          userName: socket.data.userName,
        });

        await startRoomIfReady(io, key);
      } catch (error) {
        console.error('Session join error:', error.message);

        reply({
          success: false,
          message: 'Could not join the session.',
        });
      }
    });

    socket.on('session:chat-send', (payload = {}, acknowledgement) => {
      const reply =
        typeof acknowledgement === 'function' ? acknowledgement : () => {};

      if (!getActiveRoom(io, socket, reply)) return;

      const message = String(payload.message || '').trim();

      if (!message) {
        reply({ success: false, message: 'Message cannot be empty.' });
        return;
      }

      if (message.length > MAX_CHAT_LENGTH) {
        reply({
          success: false,
          message: `Messages cannot exceed ${MAX_CHAT_LENGTH} characters.`,
        });
        return;
      }

      const messagePayload = {
        sessionId: String(socket.data.sessionId),
        userId: socket.data.userId,
        userName: socket.data.userName || 'Participant',
        message,
        sentAt: new Date().toISOString(),
      };

      socket
        .to(getRoomName(socket.data.sessionId))
        .emit('session:chat-message', messagePayload);

      reply({ success: true, message: messagePayload });
    });

    socket.on('webrtc:offer', (payload = {}, acknowledgement) => {
      if (!payload.offer) {
        const reply =
          typeof acknowledgement === 'function' ? acknowledgement : () => {};
        reply({ success: false, message: 'Offer is missing.' });
        return;
      }

      forwardToTargetOrRoom(
        io,
        socket,
        'webrtc:offer',
        {
          offer: payload.offer,
          targetSocketId: payload.targetSocketId,
        },
        acknowledgement,
      );
    });

    socket.on('webrtc:answer', (payload = {}, acknowledgement) => {
      if (!payload.answer) {
        const reply =
          typeof acknowledgement === 'function' ? acknowledgement : () => {};
        reply({ success: false, message: 'Answer is missing.' });
        return;
      }

      forwardToTargetOrRoom(
        io,
        socket,
        'webrtc:answer',
        {
          answer: payload.answer,
          targetSocketId: payload.targetSocketId,
        },
        acknowledgement,
      );
    });

    socket.on('webrtc:ice-candidate', (payload = {}, acknowledgement) => {
      if (!payload.candidate) {
        const reply =
          typeof acknowledgement === 'function' ? acknowledgement : () => {};
        reply({ success: false, message: 'ICE candidate is missing.' });
        return;
      }

      forwardToTargetOrRoom(
        io,
        socket,
        'webrtc:ice-candidate',
        {
          candidate: payload.candidate,
          targetSocketId: payload.targetSocketId,
        },
        acknowledgement,
      );
    });

    socket.on('session:screen-share-start', (payload = {}, acknowledgement) => {
      const reply =
        typeof acknowledgement === 'function' ? acknowledgement : () => {};

      if (!getActiveRoom(io, socket, reply)) return;

      const streamId = String(payload.streamId || '').trim();
      const trackId = String(payload.trackId || '').trim();

      if (!streamId) {
        reply({
          success: false,
          message: 'Screen stream ID is required.',
        });
        return;
      }

      const key = String(socket.data.sessionId);
      let sharers = roomScreenSharers.get(key);

      if (!sharers) {
        sharers = new Map();
        roomScreenSharers.set(key, sharers);
      }

      sharers.set(socket.id, { streamId, trackId });

      socket.to(getRoomName(key)).emit('session:screen-share-started', {
        sessionId: key,
        userId: socket.data.userId,
        userName: socket.data.userName || 'Participant',
        fromSocketId: socket.id,
        streamId,
        trackId,
      });

      reply({ success: true });
    });

    socket.on('session:screen-share-stop', (payload = {}, acknowledgement) => {
      const reply =
        typeof acknowledgement === 'function' ? acknowledgement : () => {};

      if (!getActiveRoom(io, socket, reply)) return;

      const key = String(socket.data.sessionId);
      const storedShare = removeScreenSharer(key, socket.id);
      const requestedStreamId = payload.streamId
        ? String(payload.streamId)
        : null;
      const share =
        storedShare ||
        (requestedStreamId ? { streamId: requestedStreamId } : null);

      notifyScreenShareStopped(io, key, socket, share);

      reply({ success: true });
    });

    socket.on('session:leave', async (payload = {}, acknowledgement) => {
      const reply =
        typeof acknowledgement === 'function' ? acknowledgement : () => {};

      const sessionId = String(
        socket.data.sessionId || payload.sessionId || '',
      );

      if (!sessionId) {
        reply({ success: true });
        return;
      }

      const roomName = getRoomName(sessionId);
      const share = removeScreenSharer(sessionId, socket.id);

      if (share) {
        socket.to(roomName).emit('session:screen-share-stopped', {
          sessionId,
          userId: socket.data.userId,
          fromSocketId: socket.id,
          streamId: share.streamId,
          trackId: share.trackId,
        });
      }

      socket.to(roomName).emit('session:participant-left', {
        userId: socket.data.userId,
        userName: socket.data.userName,
      });

      socket.leave(roomName);

      delete socket.data.sessionId;
      delete socket.data.userName;
      delete socket.data.sessionRole;

      reply({ success: true });

      await startRoomIfReady(io, sessionId);
    });

    socket.on('disconnect', async () => {
      const sessionId = socket.data.sessionId;

      if (!sessionId) return;

      const key = String(sessionId);
      const roomName = getRoomName(key);
      const share = removeScreenSharer(key, socket.id);

      if (share) {
        socket.to(roomName).emit('session:screen-share-stopped', {
          sessionId: key,
          userId: socket.data.userId,
          fromSocketId: socket.id,
          streamId: share.streamId,
          trackId: share.trackId,
        });
      }

      socket.to(roomName).emit('session:participant-left', {
        userId: socket.data.userId,
        userName: socket.data.userName,
      });

      if (!roomStartTimes.has(key)) {
        await startRoomIfReady(io, key);
      }
    });
  });
}

module.exports = registerSessionSocket;
