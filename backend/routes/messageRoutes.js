const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  sendMessage,
  getConversation,
  markMessagesRead,
} = require('../controllers/messageController');

router.use(authMiddleware);

router.post('/', sendMessage);
router.get('/:userId', getConversation);
router.patch('/:userId/read', markMessagesRead);

module.exports = router;
