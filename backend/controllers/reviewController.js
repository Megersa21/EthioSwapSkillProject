const pool = require('../config/db');

// Create a review for a completed session
const createReview = async (req, res) => {
  try {
    const reviewerId = req.user.userId;
    const { session_id, reviewee_id, rating, comment } = req.body;

    if (
      !session_id ||
      !reviewee_id ||
      rating === undefined ||
      rating === null
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Session ID, reviewee ID, and rating are required.',
      });
    }

    const sessionId = Number(session_id);
    const revieweeId = Number(reviewee_id);
    const numericRating = Number(rating);

    if (
      !Number.isSafeInteger(sessionId) ||
      sessionId <= 0 ||
      !Number.isSafeInteger(revieweeId) ||
      revieweeId <= 0
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Session ID and reviewee ID must be valid positive integers.',
      });
    }

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be an integer from 1 to 5.',
      });
    }

    if (reviewerId === revieweeId) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot review yourself.',
      });
    }

    if (
      comment !== undefined &&
      comment !== null &&
      typeof comment !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment must be text.',
      });
    }

    const sessionResult = await pool.query(
      `SELECT
         s.id,
         sr.requester_id,
         sr.recipient_id,
         s.status
       FROM public.sessions s
       JOIN public.swap_requests sr
         ON sr.id = s.swap_request_id
       WHERE s.id = $1`,
      [sessionId],
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found.',
      });
    }

    const session = sessionResult.rows[0];

    if (session.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'You can review only completed sessions.',
      });
    }

    const isParticipant =
      Number(session.requester_id) === Number(reviewerId) ||
      Number(session.recipient_id) === Number(reviewerId);

    const isOtherParticipant =
      Number(session.requester_id) === revieweeId ||
      Number(session.recipient_id) === revieweeId;

    if (!isParticipant || !isOtherParticipant) {
      return res.status(403).json({
        status: 'error',
        message: 'Only session participants can review each other.',
      });
    }

    const result = await pool.query(
      `INSERT INTO public.reviews
         (session_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        sessionId,
        reviewerId,
        revieweeId,
        numericRating,
        comment?.trim() || null,
      ],
    );

    return res.status(201).json({
      status: 'success',
      message: 'Review submitted successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        status: 'error',
        message: 'You have already reviewed this session.',
      });
    }

    console.error('Create review error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to submit review.',
    });
  }
};

// Get reviews for a user
const getUserReviews = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid user ID is required.',
      });
    }

    const result = await pool.query(
      `SELECT
         r.id,
         r.session_id,
         r.reviewer_id,
         r.reviewee_id,
         r.rating,
         r.comment,
         r.created_at,
         reviewer.full_name AS reviewer_name
       FROM public.reviews r
       JOIN public.users reviewer
         ON reviewer.id = r.reviewer_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [userId],
    );

    const averageResult = await pool.query(
      `SELECT
         COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
         COUNT(*) AS total_reviews
       FROM public.reviews
       WHERE reviewee_id = $1`,
      [userId],
    );

    return res.json({
      status: 'success',
      averageRating: Number(averageResult.rows[0].average_rating),
      totalReviews: Number(averageResult.rows[0].total_reviews),
      data: result.rows,
    });
  } catch (error) {
    console.error('Get reviews error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve reviews.',
    });
  }
};

module.exports = {
  createReview,
  getUserReviews,
};
