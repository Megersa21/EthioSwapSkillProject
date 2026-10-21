const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const {
  getStats,
  getUsers,
  getReports,
  updateReport,
  getAuditLogs,
  updateUserStatus,
  updateUserRole,
} = require('../controllers/adminController');

const {
  getContactMessages,
  markContactMessageRead,
  resolveContactMessage,
} = require('../controllers/adminContactController');

const router = express.Router();

// All admin endpoints require authentication and admin privileges.
router.use(authMiddleware, adminMiddleware);

router.get('/verify', (req, res) => {
  res.json({
    status: 'success',
    message: 'Admin access verified.',
    admin: {
      userId: req.user.userId,
      role: req.user.role,
    },
  });
});

router.get('/stats', getStats);
router.get('/users', getUsers);

router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);

router.get('/reports', getReports);
router.patch('/reports/:id', updateReport);

router.get('/audit-logs', getAuditLogs);
router.use(authMiddleware, adminMiddleware);

// Admin-only Contact Us inbox.
router.get('/contact-messages', getContactMessages);
router.patch('/contact-messages/:id/read', markContactMessageRead);
router.patch('/contact-messages/:id/resolve', resolveContactMessage);

module.exports = router;
