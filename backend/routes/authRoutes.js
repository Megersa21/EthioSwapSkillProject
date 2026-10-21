const express = require('express');
const pool = require('../config/db');

const {
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected route: requires a valid JWT
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, created_at
       FROM users
       WHERE id = $1`,
      [req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    return res.json({
      status: 'success',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Profile error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to retrieve your profile.',
    });
  }
});

// Protected route: change the logged-in user's password.
router.patch('/change-password', authMiddleware, changePassword);

module.exports = router;
