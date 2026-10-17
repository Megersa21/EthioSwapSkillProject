const pool = require('../config/db');

// Get notifications for the logged-in user
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
         n.id,
         n.type,
         n.message,
         n.related_id,
         n.is_read,
         n.created_at,
         n.actor_id,
         u.full_name AS actor_name
       FROM public.notifications n
       LEFT JOIN public.users u ON u.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId],
    );

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve notifications.',
    });
  }
};

// Count unread notifications
const getUnreadCount = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM public.notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.userId],
    );

    res.json({
      status: 'success',
      unread_count: Number(result.rows[0].unread_count),
    });
  } catch (error) {
    console.error('Unread notification count error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to count unread notifications.',
    });
  }
};

// Mark one notification as read
const markNotificationRead = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);

    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid notification ID is required.',
      });
    }

    const result = await pool.query(
      `UPDATE public.notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read`,
      [notificationId, req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found.',
      });
    }

    res.json({
      status: 'success',
      message: 'Notification marked as read.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Mark notification read error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update notification.',
    });
  }
};

// Mark all notifications as read
const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE public.notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.userId],
    );

    res.json({
      status: 'success',
      message: 'All notifications marked as read.',
      updated_count: result.rowCount,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update notifications.',
    });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
