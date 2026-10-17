const pool = require('../config/db');

// Send a message
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiver_id, message_text, swap_request_id } = req.body;

    if (!receiver_id || !message_text || !message_text.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Receiver ID and message text are required.',
      });
    }

    if (
      !Number.isSafeInteger(Number(receiver_id)) ||
      Number(receiver_id) <= 0
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Receiver ID must be a valid positive integer.',
      });
    }

    if (Number(receiver_id) === Number(senderId)) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot send a message to yourself.',
      });
    }

    const receiver = await pool.query(
      'SELECT id FROM public.users WHERE id = $1',
      [receiver_id],
    );

    if (receiver.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Receiver not found.',
      });
    }

    if (swap_request_id !== undefined && swap_request_id !== null) {
      const request = await pool.query(
        `SELECT id
         FROM public.swap_requests
         WHERE id = $1
           AND (
             (requester_id = $2 AND recipient_id = $3)
             OR
             (requester_id = $3 AND recipient_id = $2)
           )`,
        [swap_request_id, senderId, receiver_id],
      );

      if (request.rows.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'The swap request does not belong to these users.',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO public.messages
         (sender_id, receiver_id, swap_request_id, message_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [senderId, receiver_id, swap_request_id ?? null, message_text.trim()],
    );

    return res.status(201).json({
      status: 'success',
      message: 'Message sent successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send message.',
    });
  }
};

// Get messages exchanged with another user
const getConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = Number(req.params.userId);

    if (!Number.isSafeInteger(otherUserId) || otherUserId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid user ID is required.',
      });
    }

    const result = await pool.query(
      `SELECT
         m.id,
         m.sender_id,
         m.receiver_id,
         m.swap_request_id,
         m.message_text,
         m.is_read,
         m.created_at,
         sender.full_name AS sender_name,
         receiver.full_name AS receiver_name
       FROM public.messages m
       JOIN public.users sender ON sender.id = m.sender_id
       JOIN public.users receiver ON receiver.id = m.receiver_id
       WHERE
         (m.sender_id = $1 AND m.receiver_id = $2)
         OR
         (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC, m.id ASC`,
      [userId, otherUserId],
    );

    return res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve conversation.',
    });
  }
};

// Mark received messages as read
const markMessagesRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = Number(req.params.userId);

    if (!Number.isSafeInteger(otherUserId) || otherUserId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid user ID is required.',
      });
    }

    const result = await pool.query(
      `UPDATE public.messages
       SET is_read = TRUE
       WHERE sender_id = $1
         AND receiver_id = $2
         AND is_read = FALSE
       RETURNING id`,
      [otherUserId, userId],
    );

    return res.json({
      status: 'success',
      message: 'Messages marked as read.',
      updatedCount: result.rowCount,
    });
  } catch (error) {
    console.error('Mark messages read error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark messages as read.',
    });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  markMessagesRead,
};
