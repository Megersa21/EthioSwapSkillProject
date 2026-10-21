const pool = require('../config/db');

// Map notification types to the matching user preference.
function getPreferenceColumn(type) {
  const normalizedType = String(type || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

  const typeGroups = {
    message_notifications: [
      'message',
      'new_message',
      'message_received',
      'chat_message',
    ],
    request_notifications: [
      'request',
      'swap_request',
      'new_request',
      'request_received',
      'request_accepted',
      'request_rejected',
      'accepted',
      'rejected',
    ],
    session_notifications: [
      'session',
      'session_scheduled',
      'session_updated',
      'session_cancelled',
      'session_canceled',
      'session_reminder',
      'session_completed',
    ],
    review_notifications: ['review', 'new_review', 'review_received'],
  };

  for (const [column, types] of Object.entries(typeGroups)) {
    if (types.includes(normalizedType)) {
      return column;
    }
  }

  // Unknown notification types remain enabled by default.
  return null;
}

/**
 * Create a persistent notification and deliver it in real time.
 *
 * If the recipient disabled the matching notification preference,
 * skip creating the notification. The underlying action still happens.
 */
async function createNotification({
  userId,
  actorId = null,
  type,
  message,
  relatedId = null,
}) {
  const recipientId = Number(userId);

  if (!Number.isSafeInteger(recipientId) || recipientId <= 0) {
    throw new Error('A valid notification recipient is required.');
  }

  if (typeof type !== 'string' || !type.trim()) {
    throw new Error('A notification type is required.');
  }

  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('Notification message is required.');
  }

  const preferenceColumn = getPreferenceColumn(type);

  // Ensure a settings record exists for this recipient.
  await pool.query(
    `INSERT INTO public.user_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [recipientId],
  );

  // Preference column names come only from the fixed mapping above.
  if (preferenceColumn) {
    const preferenceResult = await pool.query(
      `SELECT ${preferenceColumn}
       FROM public.user_settings
       WHERE user_id = $1`,
      [recipientId],
    );

    const preferenceEnabled =
      preferenceResult.rows[0]?.[preferenceColumn] !== false;

    if (!preferenceEnabled) {
      return null;
    }
  }

  const result = await pool.query(
    `INSERT INTO public.notifications
       (user_id, actor_id, type, message, related_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, actor_id, type, message,
               related_id, is_read, created_at`,
    [
      recipientId,
      actorId === null ? null : Number(actorId),
      type.trim(),
      message.trim(),
      relatedId,
    ],
  );

  const notification = result.rows[0];

  // Keep the existing real-time delivery and unread-count behavior.
  const io = global.notificationIO;

  if (io) {
    io.to(`user:${recipientId}`).emit('notification:new', notification);

    try {
      const unreadResult = await pool.query(
        `SELECT COUNT(*)::int AS unread_count
         FROM public.notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [recipientId],
      );

      io.to(`user:${recipientId}`).emit(
        'notification:unread-count',
        unreadResult.rows[0].unread_count,
      );
    } catch (error) {
      console.error(
        'Could not broadcast notification unread count:',
        error.message,
      );
    }
  }

  return notification;
}

module.exports = { createNotification };
