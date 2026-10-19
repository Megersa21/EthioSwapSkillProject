const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Every route in this file requires an authenticated admin.
router.use(authMiddleware, adminMiddleware);

// Test that admin authentication and authorization work.
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

module.exports = router;
