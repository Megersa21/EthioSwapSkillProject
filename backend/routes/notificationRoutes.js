const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(authMiddleware);

// Get all notifications for the logged-in user
router.get('/', getMyNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark all notifications as read
router.patch('/read-all', markAllNotificationsRead);

// Mark one notification as read
router.patch('/:id/read', markNotificationRead);

module.exports = router;
