const pool = require('../config/db');

/**
 * Create a persistent notification and deliver it in real time.
 *
 * Required:
 *   userId  - the notification recipient
 *   actorId - the user who triggered the event (or null)
 *   type    - notification event type
 *   message - readable notification text
 *
 * Optional:
 *   relatedId - ID of the related request, session, or message
 *
 * Returns the saved notification.
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

  // Socket.IO is optional here so notifications can still be saved
  // when the socket server is not available.
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
