const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  createSession,
  getMySessions,
  updateSession,
} = require('../controllers/sessionController');

router.use(authMiddleware);

router.post('/', createSession);
router.get('/', getMySessions);
router.patch('/:id', updateSession);

module.exports = router;
