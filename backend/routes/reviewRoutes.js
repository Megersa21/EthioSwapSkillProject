const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const {
  createReview,
  getUserReviews,
} = require('../controllers/reviewController');

router.post('/', authMiddleware, createReview);
router.get('/user/:userId', getUserReviews);

module.exports = router;
