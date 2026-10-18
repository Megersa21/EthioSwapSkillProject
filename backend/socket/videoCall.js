const jwt = require('jsonwebtoken');

module.exports = function registerVideoCall(io, pool) {
  // Authenticate every video-call connection.
  io.use((socket, next) => {
    const suppliedToken = socket.handshake.auth?.token;

    if (!suppliedToken) {
      return next(new Error('Authentication required. Please log in.'));
    }

    const token = suppliedToken.startsWith('Bearer ')
      ? suppliedToken.slice(7)
      : suppliedToken;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.userId === undefined || decoded.userId === null) {
        return next(new Error('Invalid authentication token.'));
      }

      socket.data.userId = String(decoded.userId);
      next();
    } catch (error) {
      next(new Error('Invalid or expired token. Please log in again.'));
    }
  });

  function leaveVideoRoom(socket) {
    const room = socket.data.videoRoom;

    if (!room) return;

    socket.to(room).emit('video:peer-left');
    socket.leave(room);

    socket.data.videoRoom = null;
    socket.data.videoSessionId = null;
  }

  io.on('connection', (socket) => {
    console.log(`Video signaling connected for user ${socket.data.userId}`);

    socket.on('video:join', async (payload = {}) => {
      try {
        const sessionId = Number(payload.sessionId);

        if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
          socket.emit('video:error', {
            message: 'Invalid session ID.',
          });
          return;
        }

        const result = await pool.query(
          `SELECT
             s.id,
             s.status,
             sr.requester_id,
             sr.recipient_id
           FROM public.sessions s
           JOIN public.swap_requests sr
             ON sr.id = s.swap_request_id
           WHERE s.id = $1`,
          [sessionId],
        );

        if (result.rows.length === 0) {
          socket.emit('video:error', {
            message: 'Session not found.',
          });
          return;
        }

        const session = result.rows[0];
        const userId = socket.data.userId;

        const isParticipant =
          String(session.requester_id) === userId ||
          String(session.recipient_id) === userId;

        if (!isParticipant) {
          socket.emit('video:error', {
            message: 'You are not a participant in this session.',
          });
          return;
        }

        if (
          ['cancelled', 'completed'].includes(
            String(session.status).toLowerCase(),
          )
        ) {
          socket.emit('video:error', {
            message: 'This session is no longer available for calling.',
          });
          return;
        }

        const room = `video-session:${sessionId}`;

        // Avoid leaving another call until the new session is validated.
        if (socket.data.videoRoom === room) {
          socket.emit('video:joined', { sessionId });
          return;
        }

        const members = await io.in(room).fetchSockets();

        if (members.some((member) => member.data.userId === userId)) {
          socket.emit('video:error', {
            message: 'You are already connected to this video session.',
          });
          return;
        }

        if (members.length >= 2) {
          socket.emit('video:error', {
            message: 'This video session already has two participants.',
          });
          return;
        }

        leaveVideoRoom(socket);

        socket.join(room);
        socket.data.videoRoom = room;
        socket.data.videoSessionId = sessionId;

        socket.emit('video:joined', { sessionId });

        // Existing participant starts the WebRTC offer.
        socket.to(room).emit('video:peer-joined');
      } catch (error) {
        console.error('Video join error:', error);

        socket.emit('video:error', {
          message: 'Could not join the video session.',
        });
      }
    });

    socket.on('video:offer', (offer) => {
      if (socket.data.videoRoom && offer) {
        socket.to(socket.data.videoRoom).emit('video:offer', offer);
      }
    });

    socket.on('video:answer', (answer) => {
      if (socket.data.videoRoom && answer) {
        socket.to(socket.data.videoRoom).emit('video:answer', answer);
      }
    });

    socket.on('video:ice-candidate', (candidate) => {
      if (socket.data.videoRoom && candidate) {
        socket.to(socket.data.videoRoom).emit('video:ice-candidate', candidate);
      }
    });

    socket.on('video:leave', () => {
      leaveVideoRoom(socket);
    });

    socket.on('disconnect', () => {
      leaveVideoRoom(socket);
    });
  });
};
