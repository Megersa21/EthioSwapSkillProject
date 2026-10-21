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

function getIO(req) {
  return req.app.get('io');
}

async function broadcastUnreadCount(req, userId) {
  const io = getIO(req);
  if (!io) return;

  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM public.notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );

    io.to(`user:${userId}`).emit(
      'notification:unread-count',
      Number(result.rows[0]?.unread_count || 0),
    );
  } catch (error) {
    console.error('Could not broadcast unread notification count:', error);
  }
}

function profileImageExpression(alias) {
  // to_jsonb avoids SQL errors if a particular optional image column
  // does not exist in the users table.
  return `COALESCE(
    NULLIF(to_jsonb(${alias})->>'profile_image', ''),
    NULLIF(to_jsonb(${alias})->>'profileImage', ''),
    NULLIF(to_jsonb(${alias})->>'profile_picture', ''),
    NULLIF(to_jsonb(${alias})->>'avatar_url', ''),
    NULLIF(to_jsonb(${alias})->>'avatar', '')
  )`;
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
    deleteUploadedFile(file);
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
      // Use the column names used by the current swap-request schema.
      const requestResult = await pool.query(
        `SELECT id
         FROM public.swap_requests
         WHERE id = $1
           AND (
             (requester_id = $2 AND recipient_id = $3)
             OR (requester_id = $3 AND recipient_id = $2)
           )`,
        [swapRequestId, senderId, receiverId],
      );

      if (!requestResult.rowCount) {
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
      `SELECT
         id,
         full_name,
         ${profileImageExpression('users')} AS profile_image
       FROM public.users
       WHERE id = ANY($1::int[])`,
      [[senderId, receiverId]],
    );

    const usersById = new Map(
      names.rows.map((user) => [Number(user.id), user]),
    );

    const sender = usersById.get(senderId);
    const receiver = usersById.get(receiverId);

    const completeMessage = {
      ...savedMessage,
      sender_name: sender?.full_name || 'User',
      receiver_name: receiver?.full_name || 'User',
      sender_profile_image: sender?.profile_image || null,
      receiver_profile_image: receiver?.profile_image || null,
    };

    const io = getIO(req);

    if (io) {
      io.to(`user:${senderId}`)
        .to(`user:${receiverId}`)
        .emit('message:new', completeMessage);
    }

    try {
      const senderName = sender?.full_name || 'somebody';

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
         ${profileImageExpression('u')} AS partner_profile_image,
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
         receiver.full_name AS receiver_name,
         ${profileImageExpression('sender')} AS sender_profile_image,
         ${profileImageExpression('receiver')} AS receiver_profile_image
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

const markMessagesRead = async (req, res) => {
  try {
    // Get the authenticated user's ID.
    const userId = Number(
      req.user?.userId ?? req.user?.id ?? req.user?.user_id,
    );

    // Support the common route parameter names.
    const partnerId = Number(
      req.params.partnerId ?? req.params.id ?? req.params.userId,
    );

    // Validate both IDs.
    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(partnerId) ||
      partnerId <= 0 ||
      userId === partnerId
    ) {
      console.error('Invalid message read IDs:', {
        userId,
        routeParams: req.params,
      });

      return res.status(400).json({
        status: 'error',
        message: 'Invalid user or conversation.',
      });
    }

    // Mark incoming messages from this partner as read.
    await pool.query(
      `UPDATE public.messages
       SET is_read = TRUE
       WHERE sender_id = $1
         AND receiver_id = $2
         AND is_read = FALSE`,
      [partnerId, userId],
    );

    // Find all incoming message IDs for this conversation.
    const messageResult = await pool.query(
      `SELECT id
       FROM public.messages
       WHERE sender_id = $1
         AND receiver_id = $2`,
      [partnerId, userId],
    );

    const messageIds = messageResult.rows.map((row) => String(row.id));

    // Mark notifications linked to these messages as read.
    if (messageIds.length > 0) {
      await pool.query(
        `UPDATE public.notifications
         SET is_read = TRUE
         WHERE user_id = $1
           AND type IN ('new_message', 'message')
           AND related_id::text = ANY($2::text[])
           AND is_read = FALSE`,
        [userId, messageIds],
      );
    }

    // Recalculate the Navbar's unread notification count.
    if (typeof broadcastUnreadCount === 'function') {
      await broadcastUnreadCount(req, userId);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Messages marked as read.',
    });
  } catch (error) {
    console.error('Mark messages read error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not mark messages as read.',
    });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getConversation,
  markMessagesRead,
};
