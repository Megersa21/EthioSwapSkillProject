const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

const {
  getSettings,
  updateProfile,
  updatePreferences,
  changePassword,
  deactivateAccount,
} = require('../controllers/accountController');

const router = express.Router();

// Every account-settings endpoint requires a valid, active account.
router.use(authMiddleware);

router.get('/settings', getSettings);
router.patch('/settings/profile', updateProfile);
router.patch('/settings/preferences', updatePreferences);
router.patch('/settings/password', changePassword);
router.post('/deactivate', deactivateAccount);

module.exports = router;
