const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const {
  getStats,
  getUsers,
  getReports,
  updateReport,
  getAuditLogs,
} = require('../controllers/adminController');

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

router.get('/reports', getReports);
router.patch('/reports/:id', updateReport);

router.get('/audit-logs', getAuditLogs);

module.exports = router;
