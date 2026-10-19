const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Submit a report (available to authenticated users)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { reported_user_id, report_type, description } = req.body;

    if (!report_type || !description || !description.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Report type and description are required.',
      });
    }

    const allowedTypes = [
      'user',
      'inappropriate_behavior',
      'scam',
      'technical_issue',
      'other',
    ];

    if (!allowedTypes.includes(report_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid report type.',
      });
    }

    if (
      reported_user_id !== undefined &&
      reported_user_id !== null &&
      reported_user_id !== ''
    ) {
      const targetUserId = Number(reported_user_id);

      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid reported user ID.',
        });
      }

      if (targetUserId === reporterId) {
        return res.status(400).json({
          status: 'error',
          message: 'You cannot report yourself.',
        });
      }

      const targetUser = await pool.query(
        'SELECT id FROM public.users WHERE id = $1',
        [targetUserId],
      );

      if (targetUser.rowCount === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Reported user not found.',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO public.reports
        (reporter_id, reported_user_id, report_type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        reporterId,
        reported_user_id ? Number(reported_user_id) : null,
        report_type,
        description.trim(),
      ],
    );

    return res.status(201).json({
      status: 'success',
      message: 'Report submitted successfully.',
      report: result.rows[0],
    });
  } catch (error) {
    console.error('Submit report error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Could not submit report.',
    });
  }
});

module.exports = router;
