const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  createRequest,
  getMyRequests,
  acceptRequest,
  rejectRequest,
} = require('../controllers/swapRequestController');

// All request endpoints require authentication.
router.use(authMiddleware);

router.post('/', createRequest);
router.get('/', getMyRequests);

router.patch('/:id/accept', acceptRequest);
router.patch('/:id/reject', rejectRequest);

module.exports = router;
