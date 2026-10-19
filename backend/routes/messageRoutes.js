const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/messageUpload');

const {
  sendMessage,
  getConversations,
  getConversation,
  markMessagesRead,
} = require('../controllers/messageController');

router.use(authMiddleware);

router.get('/', getConversations);
router.post(
  '/',
  (req, res, next) => {
    upload.single('attachment')(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          status: 'error',
          message:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'File must be 10 MB or smaller.'
              : error.message || 'Could not upload attachment.',
        });
      }

      next();
    });
  },
  sendMessage,
);

router.get('/:userId', getConversation);
router.patch('/:userId/read', markMessagesRead);

module.exports = router;
