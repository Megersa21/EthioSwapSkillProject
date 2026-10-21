const pool = require('../config/db');

async function getContactMessages(req, res) {
  try {
    const requestedStatus = req.query.status || 'all';
    const allowedStatuses = ['all', 'new', 'read', 'resolved'];

    if (!allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid contact message status filter.',
      });
    }

    const values = [];
    let whereClause = '';

    if (requestedStatus !== 'all') {
      values.push(requestedStatus);
      whereClause = 'WHERE status = $1';
    }

    const result = await pool.query(
      `SELECT id, name, email, topic, message, status, created_at
       FROM public.contact_messages
       ${whereClause}
       ORDER BY
         CASE WHEN status = 'new' THEN 0 ELSE 1 END,
         created_at DESC`,
      values,
    );

    return res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Could not load contact messages:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Could not load contact messages.',
    });
  }
}

async function updateContactMessageStatus(req, res, nextStatus) {
  const { id } = req.params;

  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid contact message ID.',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE public.contact_messages
       SET status = $1
       WHERE id = $2
       RETURNING id, name, email, topic, message, status, created_at`,
      [nextStatus, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact message not found.',
      });
    }

    return res.json({
      status: 'success',
      message:
        nextStatus === 'read'
          ? 'Message marked as read.'
          : 'Message marked as resolved.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Could not update contact message:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Could not update the contact message.',
    });
  }
}

async function markContactMessageRead(req, res) {
  return updateContactMessageStatus(req, res, 'read');
}

async function resolveContactMessage(req, res) {
  return updateContactMessageStatus(req, res, 'resolved');
}

module.exports = {
  getContactMessages,
  markContactMessageRead,
  resolveContactMessage,
};
