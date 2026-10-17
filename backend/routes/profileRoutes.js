const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  getProfile,
  getMyProfile,
  updateMyProfile,
} = require('../controllers/profilecontroller');

// Keep these routes BEFORE /:userId
router.get('/me', authMiddleware, getMyProfile);
router.put('/me', authMiddleware, updateMyProfile);

// Public profile route must come last
router.get('/:userId', getProfile);

module.exports = router;
