const pool = require('../config/db');
const { createNotification } = require('../services/notificationService');
const fs = require('fs');
const path = require('path');

function deleteUploadedFile(file) {
  if (!file) return;

  fs.unlink(file.path, (error) => {
    if (error) console.error('Could not remove unused upload:', error);
  });
}

async function sendMessage(req, res) {
  const senderId = Number(req.user.userId);
  const receiverId = Number(req.body.receiver_id);
  const messageText = String(req.body.message_text || '').trim();
  const swapRequestId = req.body.swap_request_id || null;
  const file = req.file;

  if (!receiverId || receiverId === senderId) {
    deleteUploadedFile(file);
    return res.status(400).json({
      status: 'error',
      message: 'Choose a valid recipient other than yourself.',
    });
  }

  if (!messageText && !file) {
    return res.status(400).json({
      status: 'error',
      message: 'Write a message or attach a file.',
    });
  }

  if (messageText.length > 10000) {
    deleteUploadedFile(file);
    return res.status(400).json({
      status: 'error',
      message: 'Messages cannot exceed 10,000 characters.',
    });
  }

  try {
    const recipient = await pool.query(
      'SELECT id FROM public.users WHERE id = $1',
      [receiverId],
    );

    if (!recipient.rowCount) {
      deleteUploadedFile(file);
      return res.status(404).json({
        status: 'error',
        message: 'Recipient not found.',
      });
    }

    if (swapRequestId) {
      const request = await pool.query(
        `SELECT id
         FROM public.swap_requests
         WHERE id = $1
           AND (
             (sender_id = $2 AND receiver_id = $3)
             OR (sender_id = $3 AND receiver_id = $2)
           )`,
        [swapRequestId, senderId, receiverId],
      );

      if (!request.rowCount) {
        deleteUploadedFile(file);
        return res.status(400).json({
          status: 'error',
          message: 'The swap request is not associated with these users.',
        });
      }
    }

    const attachmentUrl = file
      ? `/uploads/messages/${path.basename(file.filename)}`
      : null;

    const attachmentName = file ? file.originalname : null;
    const attachmentType = file ? file.mimetype : null;

    const result = await pool.query(
      `INSERT INTO public.messages
       (
         sender_id,
         receiver_id,
         swap_request_id,
         message_text,
         attachment_url,
         attachment_name,
         attachment_type
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         sender_id,
         receiver_id,
         swap_request_id,
         message_text,
         attachment_url,
         attachment_name,
         attachment_type,
         is_read,
         created_at`,
      [
        senderId,
        receiverId,
        swapRequestId,
        messageText,
        attachmentUrl,
        attachmentName,
        attachmentType,
      ],
    );

    const savedMessage = result.rows[0];

    const names = await pool.query(
      `SELECT id, full_name
       FROM public.users
       WHERE id = ANY($1::int[])`,
      [[senderId, receiverId]],
    );

    const userNames = new Map(
      names.rows.map((user) => [Number(user.id), user.full_name]),
    );

    const completeMessage = {
      ...savedMessage,
      sender_name: userNames.get(senderId) || 'User',
      receiver_name: userNames.get(receiverId) || 'User',
    };

    const io = req.app.get('io');

    if (io) {
      io.to(`user:${senderId}`)
        .to(`user:${receiverId}`)
        .emit('message:new', completeMessage);
    }
    // Save and broadcast a notification to the message recipient.
    // Save and broadcast a notification to the message recipient.
    try {
      const senderName =
        completeMessage.sender_name || completeMessage.full_name || 'somebody';

      await createNotification({
        userId: receiverId,
        actorId: senderId,
        type: 'new_message',
        message: `You received a new message from ${senderName}.`,
        relatedId: completeMessage.id,
      });
    } catch (notificationError) {
      console.error('Direct message notification error:', notificationError);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Message sent successfully.',
      data: completeMessage,
    });
  } catch (error) {
    deleteUploadedFile(file);
    console.error('sendMessage error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not send the message.',
    });
  }
}

async function getConversations(req, res) {
  const userId = Number(req.user.userId);

  try {
    const result = await pool.query(
      `WITH ranked AS (
         SELECT
           m.*,
           CASE
             WHEN m.sender_id = $1 THEN m.receiver_id
             ELSE m.sender_id
           END AS partner_id,
           ROW_NUMBER() OVER (
             PARTITION BY LEAST(m.sender_id, m.receiver_id),
                          GREATEST(m.sender_id, m.receiver_id)
             ORDER BY m.created_at DESC, m.id DESC
           ) AS row_num
         FROM public.messages m
         WHERE m.sender_id = $1 OR m.receiver_id = $1
       )
       SELECT
         r.partner_id,
         u.full_name AS partner_name,
         r.message_text AS last_message,
         r.attachment_name AS last_attachment_name,
         r.created_at AS last_message_at,
         (
           SELECT COUNT(*)::int
           FROM public.messages unread
           WHERE unread.sender_id = r.partner_id
             AND unread.receiver_id = $1
             AND unread.is_read = FALSE
         ) AS unread_count
       FROM ranked r
       JOIN public.users u ON u.id = r.partner_id
       WHERE r.row_num = 1
       ORDER BY r.created_at DESC`,
      [userId],
    );

    return res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('getConversations error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not load conversations.',
    });
  }
}

async function getConversation(req, res) {
  const userId = Number(req.user.userId);
  const partnerId = Number(req.params.userId);

  if (!partnerId || partnerId === userId) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid conversation partner.',
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         m.id,
         m.sender_id,
         m.receiver_id,
         m.swap_request_id,
         m.message_text,
         m.attachment_url,
         m.attachment_name,
         m.attachment_type,
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
      [userId, partnerId],
    );

    return res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('getConversation error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not load conversation.',
    });
  }
}

async function markMessagesRead(req, res) {
  const userId = Number(req.user.userId);
  const partnerId = Number(req.params.userId);

  try {
    await pool.query(
      `UPDATE public.messages
       SET is_read = TRUE
       WHERE sender_id = $1
         AND receiver_id = $2
         AND is_read = FALSE`,
      [partnerId, userId],
    );

    return res.json({
      status: 'success',
      message: 'Messages marked as read.',
    });
  } catch (error) {
    console.error('markMessagesRead error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not mark messages as read.',
    });
  }
}

module.exports = {
  sendMessage,
  getConversations,
  getConversation,
  markMessagesRead,
};
