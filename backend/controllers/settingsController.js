const pool = require('../config/db');

const DEFAULT_SETTINGS = {
  message_notifications: true,
  request_notifications: true,
  session_notifications: true,
  review_notifications: true,
  dark_mode: false,
};

// GET /api/settings
// Return the logged-in user's settings, creating defaults if necessary.
async function getSettings(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `INSERT INTO public.user_settings (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );

    const settingsResult = await pool.query(
      `SELECT
         message_notifications,
         request_notifications,
         session_notifications,
         review_notifications,
         dark_mode
       FROM public.user_settings
       WHERE user_id = $1`,
      [userId],
    );

    return res.status(200).json({
      status: 'success',
      settings: settingsResult.rows[0] || DEFAULT_SETTINGS,
    });
  } catch (error) {
    console.error('Get settings error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not load settings.',
    });
  }
}

// PUT /api/settings
// Update only the authenticated user's settings.
async function updateSettings(req, res) {
  try {
    const userId = req.user.userId;

    const {
      message_notifications,
      request_notifications,
      session_notifications,
      review_notifications,
      dark_mode,
    } = req.body;

    const settings = {
      message_notifications,
      request_notifications,
      session_notifications,
      review_notifications,
      dark_mode,
    };

    for (const [key, value] of Object.entries(settings)) {
      if (typeof value !== 'boolean') {
        return res.status(400).json({
          status: 'error',
          message: `${key} must be true or false.`,
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO public.user_settings (
         user_id,
         message_notifications,
         request_notifications,
         session_notifications,
         review_notifications,
         dark_mode,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         message_notifications = EXCLUDED.message_notifications,
         request_notifications = EXCLUDED.request_notifications,
         session_notifications = EXCLUDED.session_notifications,
         review_notifications = EXCLUDED.review_notifications,
         dark_mode = EXCLUDED.dark_mode,
         updated_at = NOW()
       RETURNING
         message_notifications,
         request_notifications,
         session_notifications,
         review_notifications,
         dark_mode`,
      [
        userId,
        message_notifications,
        request_notifications,
        session_notifications,
        review_notifications,
        dark_mode,
      ],
    );

    return res.status(200).json({
      status: 'success',
      message: 'Settings saved successfully.',
      settings: result.rows[0],
    });
  } catch (error) {
    console.error('Update settings error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not save settings.',
    });
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
