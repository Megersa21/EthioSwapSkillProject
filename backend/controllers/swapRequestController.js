const pool = require('../config/db');

// Helper: create a notification
async function createNotification(userId, actorId, type, message, relatedId) {
  await pool.query(
    `INSERT INTO public.notifications
       (user_id, actor_id, type, message, related_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, actorId, type, message, relatedId],
  );
}

// Send a new skill-swap request
const createRequest = async (req, res) => {
  try {
    const { offered_skill_id, wanted_skill_id, message } = req.body;

    if (!offered_skill_id || !wanted_skill_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Both offered_skill_id and wanted_skill_id are required.',
      });
    }

    if (String(offered_skill_id) === String(wanted_skill_id)) {
      return res.status(400).json({
        status: 'error',
        message: 'You must select two different skills.',
      });
    }

    const offeredResult = await pool.query(
      `SELECT id, user_id, skill_name, skill_type
       FROM public.skills WHERE id = $1`,
      [offered_skill_id],
    );

    if (offeredResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'The offered skill was not found.',
      });
    }

    const offeredSkill = offeredResult.rows[0];

    if (String(offeredSkill.user_id) !== String(req.user.userId)) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only offer your own skills.',
      });
    }

    if (offeredSkill.skill_type !== 'teach') {
      return res.status(400).json({
        status: 'error',
        message: 'Your offered skill must have the type teach.',
      });
    }

    const wantedResult = await pool.query(
      `SELECT id, user_id, skill_name, skill_type
       FROM public.skills WHERE id = $1`,
      [wanted_skill_id],
    );

    if (wantedResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'The wanted skill was not found.',
      });
    }

    const wantedSkill = wantedResult.rows[0];

    if (String(wantedSkill.user_id) === String(req.user.userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot send a swap request to yourself.',
      });
    }

    if (wantedSkill.skill_type !== 'teach') {
      return res.status(400).json({
        status: 'error',
        message: 'The wanted skill must be offered for teaching.',
      });
    }

    if (
      message !== undefined &&
      message !== null &&
      typeof message !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Message must be text.',
      });
    }

    const duplicate = await pool.query(
      `SELECT id FROM public.swap_requests
       WHERE requester_id = $1
         AND recipient_id = $2
         AND offered_skill_id = $3
         AND wanted_skill_id = $4
         AND status = 'pending'`,
      [req.user.userId, wantedSkill.user_id, offered_skill_id, wanted_skill_id],
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'You already have a pending request for these skills.',
      });
    }

    const result = await pool.query(
      `INSERT INTO public.swap_requests
       (requester_id, recipient_id, offered_skill_id,
        wanted_skill_id, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.userId,
        wantedSkill.user_id,
        offered_skill_id,
        wanted_skill_id,
        message?.trim() || null,
      ],
    );

    const request = result.rows[0];

    // Notify the recipient that a new request arrived.
    try {
      await createNotification(
        request.recipient_id,
        request.requester_id,
        'swap_request',
        'You received a new skill-swap request.',
        request.id,
      );
    } catch (notificationError) {
      console.error('Create request notification error:', notificationError);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Skill-swap request sent successfully.',
      request,
    });
  } catch (error) {
    console.error('Create swap request error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not send the swap request.',
    });
  }
};

// Get requests sent or received by the logged-in user
const getMyRequests = async (req, res) => {
  try {
    const { direction = 'all', status } = req.query;

    if (!['all', 'sent', 'received'].includes(direction)) {
      return res.status(400).json({
        status: 'error',
        message: 'direction must be all, sent, or received.',
      });
    }

    if (status && !['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request status.',
      });
    }

    const conditions = [];
    const values = [];

    if (direction === 'sent') {
      values.push(req.user.userId);
      conditions.push(`sr.requester_id = $${values.length}`);
    } else if (direction === 'received') {
      values.push(req.user.userId);
      conditions.push(`sr.recipient_id = $${values.length}`);
    } else {
      values.push(req.user.userId);
      conditions.push(
        `(sr.requester_id = $${values.length}
          OR sr.recipient_id = $${values.length})`,
      );
    }

    if (status) {
      values.push(status);
      conditions.push(`sr.status = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT
         sr.id, sr.requester_id, sr.recipient_id,
         sr.offered_skill_id, sr.wanted_skill_id,
         sr.message, sr.status, sr.created_at, sr.updated_at,
         requester.full_name AS requester_name,
         recipient.full_name AS recipient_name,
         offered.skill_name AS offered_skill_name,
         wanted.skill_name AS wanted_skill_name
       FROM public.swap_requests sr
       JOIN public.users requester ON requester.id = sr.requester_id
       JOIN public.users recipient ON recipient.id = sr.recipient_id
       JOIN public.skills offered ON offered.id = sr.offered_skill_id
       JOIN public.skills wanted ON wanted.id = sr.wanted_skill_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY sr.created_at DESC`,
      values,
    );

    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      requests: result.rows,
    });
  } catch (error) {
    console.error('Get swap requests error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not retrieve swap requests.',
    });
  }
};

// Accept an incoming request
const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE public.swap_requests
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND recipient_id = $2
         AND status = 'pending'
       RETURNING *`,
      [id, req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Pending request not found, or you are not its recipient.',
      });
    }

    const request = result.rows[0];

    try {
      await createNotification(
        request.requester_id,
        request.recipient_id,
        'request_accepted',
        'Your skill-swap request was accepted.',
        request.id,
      );
    } catch (notificationError) {
      console.error('Accept request notification error:', notificationError);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Swap request accepted.',
      request,
    });
  } catch (error) {
    console.error('Accept swap request error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not accept the request.',
    });
  }
};

// Reject an incoming request
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE public.swap_requests
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND recipient_id = $2
         AND status = 'pending'
       RETURNING *`,
      [id, req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Pending request not found, or you are not its recipient.',
      });
    }

    const request = result.rows[0];

    try {
      await createNotification(
        request.requester_id,
        request.recipient_id,
        'request_rejected',
        'Your skill-swap request was rejected.',
        request.id,
      );
    } catch (notificationError) {
      console.error('Reject request notification error:', notificationError);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Swap request rejected.',
      request,
    });
  } catch (error) {
    console.error('Reject swap request error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not reject the request.',
    });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  acceptRequest,
  rejectRequest,
};
