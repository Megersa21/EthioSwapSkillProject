const pool = require('../config/db');

// Create a session from an accepted swap request
const createSession = async (req, res) => {
  try {
    const {
      swap_request_id,
      scheduled_at,
      duration_minutes = 60,
      meeting_link,
      notes,
    } = req.body;

    if (!swap_request_id) {
      return res.status(400).json({
        status: 'error',
        message: 'swap_request_id is required.',
      });
    }

    const duration = Number(duration_minutes);

    if (!Number.isInteger(duration) || duration <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Duration must be a positive whole number.',
      });
    }

    if (scheduled_at && Number.isNaN(Date.parse(scheduled_at))) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid session date and time.',
      });
    }

    if (
      meeting_link !== undefined &&
      meeting_link !== null &&
      typeof meeting_link !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Meeting link must be text.',
      });
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Notes must be text.',
      });
    }

    // Only participants in an accepted request can create a session.
    const requestResult = await pool.query(
      `SELECT id
       FROM public.swap_requests
       WHERE id = $1
         AND status = 'accepted'
         AND (requester_id = $2 OR recipient_id = $2)`,
      [swap_request_id, req.user.userId],
    );

    if (requestResult.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'An accepted swap request involving you is required.',
      });
    }

    const result = await pool.query(
      `INSERT INTO public.sessions
       (swap_request_id, scheduled_at, duration_minutes, meeting_link, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        swap_request_id,
        scheduled_at || null,
        duration,
        meeting_link?.trim() || null,
        notes?.trim() || null,
      ],
    );

    return res.status(201).json({
      status: 'success',
      message: 'Session created successfully.',
      session: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        status: 'error',
        message: 'A session already exists for this swap request.',
      });
    }

    console.error('Create session error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not create session.',
    });
  }
};

// Get sessions belonging to the logged-in user
const getMySessions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         s.*,
         sr.requester_id,
         sr.recipient_id,
         requester.full_name AS requester_name,
         recipient.full_name AS recipient_name,
         offered.skill_name AS offered_skill_name,
         wanted.skill_name AS wanted_skill_name
       FROM public.sessions s
       JOIN public.swap_requests sr
         ON sr.id = s.swap_request_id
       JOIN public.users requester
         ON requester.id = sr.requester_id
       JOIN public.users recipient
         ON recipient.id = sr.recipient_id
       JOIN public.skills offered
         ON offered.id = sr.offered_skill_id
       JOIN public.skills wanted
         ON wanted.id = sr.wanted_skill_id
       WHERE sr.requester_id = $1 OR sr.recipient_id = $1
       ORDER BY s.scheduled_at ASC NULLS LAST, s.created_at DESC`,
      [req.user.userId],
    );

    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      sessions: result.rows,
    });
  } catch (error) {
    console.error('Get sessions error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not retrieve sessions.',
    });
  }
};

// Update session details or status
const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at, duration_minutes, meeting_link, notes, status } =
      req.body;

    const existingResult = await pool.query(
      `SELECT s.*
       FROM public.sessions s
       JOIN public.swap_requests sr
         ON sr.id = s.swap_request_id
       WHERE s.id = $1
         AND (sr.requester_id = $2 OR sr.recipient_id = $2)`,
      [id, req.user.userId],
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found.',
      });
    }

    const current = existingResult.rows[0];

    const nextScheduledAt =
      scheduled_at === undefined ? current.scheduled_at : scheduled_at;

    const nextDuration =
      duration_minutes === undefined
        ? current.duration_minutes
        : Number(duration_minutes);

    const nextMeetingLink =
      meeting_link === undefined ? current.meeting_link : meeting_link;

    const nextNotes = notes === undefined ? current.notes : notes;
    const nextStatus = status === undefined ? current.status : status;

    if (
      nextScheduledAt !== null &&
      nextScheduledAt !== undefined &&
      Number.isNaN(Date.parse(nextScheduledAt))
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid session date and time.',
      });
    }

    if (!Number.isInteger(nextDuration) || nextDuration <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Duration must be a positive whole number.',
      });
    }

    if (!['scheduled', 'completed', 'cancelled'].includes(nextStatus)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid session status.',
      });
    }

    if (
      nextMeetingLink !== null &&
      nextMeetingLink !== undefined &&
      typeof nextMeetingLink !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Meeting link must be text.',
      });
    }

    if (
      nextNotes !== null &&
      nextNotes !== undefined &&
      typeof nextNotes !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Notes must be text.',
      });
    }

    const result = await pool.query(
      `UPDATE public.sessions
       SET scheduled_at = $1,
           duration_minutes = $2,
           meeting_link = $3,
           notes = $4,
           status = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        nextScheduledAt || null,
        nextDuration,
        nextMeetingLink?.trim() || null,
        nextNotes?.trim() || null,
        nextStatus,
        id,
      ],
    );

    return res.status(200).json({
      status: 'success',
      message: 'Session updated successfully.',
      session: result.rows[0],
    });
  } catch (error) {
    console.error('Update session error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not update session.',
    });
  }
};

module.exports = {
  createSession,
  getMySessions,
  updateSession,
};
