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
  deleteUser,
} = require('../controllers/adminController');

const {
  getContactMessages,
  markContactMessageRead,
  resolveContactMessage,
} = require('../controllers/adminContactController');

const router = express.Router();

// All routes in this file require an authenticated administrator.
router.use(authMiddleware, adminMiddleware);

// Verify admin access.
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

// Dashboard statistics.
router.get('/stats', getStats);

// User management.
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Reports.
router.get('/reports', getReports);
router.patch('/reports/:id', updateReport);

// Audit logs.
router.get('/audit-logs', getAuditLogs);

// Contact Us inbox.
router.get('/contact-messages', getContactMessages);
router.patch('/contact-messages/:id/read', markContactMessageRead);
router.patch('/contact-messages/:id/resolve', resolveContactMessage);

module.exports = router;
