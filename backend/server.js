const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const skillRoutes = require('./routes/skillRoutes');
const swapRequestRoutes = require('./routes/swapRequestRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const profileRoutes = require('./routes/profileRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const registerSessionSocket = require('./socket/sessionSocket');
const registerMessageSocket = require('./socket/messageSocket');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: CLIENT_URL,
  }),
);
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/requests', swapRequestRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the EthioSwapSkill API!',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS database_time');

    res.json({
      status: 'success',
      message: 'EthioSwapSkill API and PostgreSQL are connected!',
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);

    res.status(500).json({
      status: 'error',
      message: 'Could not connect to PostgreSQL.',
    });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Video calling will be registered here in the next step.
registerSessionSocket(io);
registerMessageSocket(io);

server.listen(PORT, () => {
  console.log(`EthioSwapSkill server running on port ${PORT}`);
});
