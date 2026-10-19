const jwt = require('jsonwebtoken');

function registerMessageSocket(io) {
  // Authenticate every messaging socket using the existing JWT.
  io.of('/').use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication required.'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.userId) {
        return next(new Error('Invalid authentication token.'));
      }

      socket.userId = Number(decoded.userId);
      next();
    } catch (error) {
      next(new Error('Invalid or expired authentication token.'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = `user:${socket.userId}`;

    // Each authenticated user joins only their own private room.
    socket.join(userRoom);

    console.log(`Messaging connected: user ${socket.userId}`);

    socket.on('disconnect', () => {
      console.log(`Messaging disconnected: user ${socket.userId}`);
    });
  });
}

module.exports = registerMessageSocket;
