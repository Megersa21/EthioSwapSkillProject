const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function registerSessionSocket(io) {
  // Authenticate every Socket.IO connection using the user's JWT.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication required.'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.userId) {
        return next(new Error('Invalid authentication token.'));
      }

      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token. Please log in again.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Authenticated socket connected: ${socket.id}`);

    // Confirm that this user belongs to the requested session.
    socket.on('session:join', async (payload = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const sessionId = payload.sessionId;
      const userId = socket.data.userId;

      if (
        sessionId === undefined ||
        sessionId === null ||
        !/^[1-9]\d*$/.test(String(sessionId))
      ) {
        return reply({
          status: 'error',
          message: 'A valid session ID is required.',
        });
      }

      try {
        const result = await pool.query(
          `SELECT
     s.id AS session_id,
     s.status,
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
     AND (sr.requester_id = $2 OR sr.recipient_id = $2)`,
          [sessionId, userId],
        );

        if (result.rows.length === 0) {
          return reply({
            status: 'error',
            message: 'Session not found or you are not a participant.',
          });
        }

        const session = result.rows[0];
        socket.data.userName = session.full_name;
        socket.data.userName = session.user_name;

        if (session.status === 'cancelled' || session.status === 'completed') {
          return reply({
            status: 'success',
            sessionId: session.session_id,
            userId,
            userName: session.user_name,
            partnerName: session.partner_name,
          });
        }

        // Leave any previous session room.
        for (const joinedRoom of socket.rooms) {
          if (joinedRoom.startsWith('session:')) {
            socket.leave(joinedRoom);
          }
        }

        const room = `session:${session.session_id}`;

        socket.join(room);
        socket.data.sessionId = String(session.session_id);
        socket.data.userName = session.full_name;

        reply({
          status: 'success',
          sessionId: session.session_id,
          userId,
          userName: session.full_name,
        });

        socket.to(room).emit('session:participant-joined', {
          userId,
          userName: session.full_name,
        });

        console.log(`User ${userId} joined session ${session.session_id}`);
      } catch (error) {
        console.error('Session socket join error:', error);

        reply({
          status: 'error',
          message: 'Could not join the session.',
        });
      }
    });

    // Send a text message to the other participant in this session.
    socket.on('session:chat-send', (payload = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const sessionId = socket.data.sessionId;

      if (!sessionId || !socket.rooms.has(`session:${sessionId}`)) {
        return reply({
          status: 'error',
          message: 'Join an authorized session before chatting.',
        });
      }

      if (typeof payload.text !== 'string' || !payload.text.trim()) {
        return reply({
          status: 'error',
          message: 'Message cannot be empty.',
        });
      }

      const text = payload.text.trim();

      if (text.length > 2000) {
        return reply({
          status: 'error',
          message: 'Messages cannot exceed 2000 characters.',
        });
      }

      const message = {
        id: `${Date.now()}-${socket.id}`,
        sessionId,
        senderId: socket.data.userId,
        senderName: socket.data.userName,
        text,
        createdAt: new Date().toISOString(),
      };

      socket.to(`session:${sessionId}`).emit('session:chat-message', message);

      reply({ status: 'success', message });
    });

    // WebRTC signaling: send an offer to the other session participant.
    socket.on('webrtc:offer', (payload = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const room = `session:${socket.data.sessionId}`;

      if (!socket.data.sessionId || !socket.rooms.has(room) || !payload.offer) {
        return reply({
          status: 'error',
          message: 'Join a session before sending a call offer.',
        });
      }

      socket.to(room).emit('webrtc:offer', {
        fromUserId: socket.data.userId,
        fromUserName: socket.data.userName,
        offer: payload.offer,
      });

      reply({ status: 'success' });
    });

    // WebRTC signaling: return the answer to the caller.
    socket.on('webrtc:answer', (payload = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const room = `session:${socket.data.sessionId}`;

      if (
        !socket.data.sessionId ||
        !socket.rooms.has(room) ||
        !payload.answer
      ) {
        return reply({
          status: 'error',
          message: 'Join a session before sending a call answer.',
        });
      }

      socket.to(room).emit('webrtc:answer', {
        fromUserId: socket.data.userId,
        answer: payload.answer,
      });

      reply({ status: 'success' });
    });

    // WebRTC signaling: exchange network connection candidates.
    socket.on('webrtc:ice-candidate', (payload = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const room = `session:${socket.data.sessionId}`;

      if (
        !socket.data.sessionId ||
        !socket.rooms.has(room) ||
        !payload.candidate
      ) {
        return reply({
          status: 'error',
          message: 'Join a session before sending an ICE candidate.',
        });
      }

      socket.to(room).emit('webrtc:ice-candidate', {
        fromUserId: socket.data.userId,
        candidate: payload.candidate,
      });

      reply({ status: 'success' });
    });

    // Leave the active session room.
    socket.on('session:leave', () => {
      const sessionId = socket.data.sessionId;

      if (!sessionId) return;

      const room = `session:${sessionId}`;

      socket.to(room).emit('session:participant-left', {
        userId: socket.data.userId,
        userName: socket.data.userName,
      });

      socket.leave(room);

      delete socket.data.sessionId;
      delete socket.data.userName;
    });

    socket.on('disconnect', () => {
      const sessionId = socket.data.sessionId;

      if (sessionId) {
        socket.to(`session:${sessionId}`).emit('session:participant-left', {
          userId: socket.data.userId,
          userName: socket.data.userName,
        });
      }

      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerSessionSocket;
