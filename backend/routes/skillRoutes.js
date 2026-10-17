const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  createSkill,
  getMySkills,
  discoverSkills,
  updateSkill,
  deleteSkill,
} = require('../controllers/skillController');

// All skill endpoints require a valid login token.
router.use(authMiddleware);

router.get('/my-skills', getMySkills);
router.get('/discover', discoverSkills);
router.post('/', createSkill);
router.put('/:id', updateSkill);
router.delete('/:id', deleteSkill);

module.exports = router;
