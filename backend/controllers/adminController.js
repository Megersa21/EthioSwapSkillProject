const pool = require('../config/db');

async function getStats(req, res) {
  try {
    const [
      users,
      skills,
      requests,
      sessions,
      completedSessions,
      reviews,
      unreadNotifications,
      reports,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query('SELECT COUNT(*)::int AS count FROM skills'),
      pool.query('SELECT COUNT(*)::int AS count FROM swap_requests'),
      pool.query('SELECT COUNT(*)::int AS count FROM sessions'),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM sessions WHERE LOWER(status) = 'completed'",
      ),
      pool.query('SELECT COUNT(*)::int AS count FROM reviews'),
      pool.query(
        'SELECT COUNT(*)::int AS count FROM notifications WHERE is_read = FALSE',
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM reports WHERE status = 'pending'",
      ),
    ]);

    return res.json({
      status: 'success',
      data: {
        totalUsers: users.rows[0].count,
        totalSkills: skills.rows[0].count,
        totalRequests: requests.rows[0].count,
        totalSessions: sessions.rows[0].count,
        completedSessions: completedSessions.rows[0].count,
        totalReviews: reviews.rows[0].count,
        unreadNotifications: unreadNotifications.rows[0].count,
        pendingReports: reports.rows[0].count,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to load admin statistics.',
    });
  }
}

async function getUsers(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, role, created_at,
             updated_at, location, title
      FROM users
      ORDER BY created_at DESC NULLS LAST, id DESC
    `);

    return res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Admin users error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to load users.',
    });
  }
}

async function getReports(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.reporter_id,
        reporter.full_name AS reporter_name,
        r.reported_user_id,
        reported.full_name AS reported_user_name,
        r.report_type,
        r.description,
        r.status,
        r.admin_notes,
        r.created_at,
        r.updated_at
      FROM reports r
      LEFT JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users reported ON reported.id = r.reported_user_id
      ORDER BY r.created_at DESC, r.id DESC
    `);

    return res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Admin reports error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to load reports.',
    });
  }
}

async function updateReport(req, res) {
  const reportId = Number(req.params.id);
  const { status, admin_notes } = req.body;

  const allowedStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];

  if (!Number.isInteger(reportId) || reportId < 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid report ID.',
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid report status.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE reports
       SET status = $1,
           admin_notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [
        status,
        typeof admin_notes === 'string' ? admin_notes.trim() : null,
        reportId,
      ],
    );

    if (updated.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Report not found.',
      });
    }

    await client.query(
      `INSERT INTO audit_logs
         (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        req.user.userId,
        'report_status_updated',
        'report',
        reportId,
        JSON.stringify({
          newStatus: status,
          adminNotes:
            typeof admin_notes === 'string' ? admin_notes.trim() : null,
        }),
      ],
    );

    await client.query('COMMIT');

    return res.json({
      status: 'success',
      message: 'Report updated successfully.',
      data: updated.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update report error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to update report.',
    });
  } finally {
    client.release();
  }
}

async function getAuditLogs(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.admin_id,
        u.full_name AS admin_name,
        u.email AS admin_email,
        a.action,
        a.target_type,
        a.target_id,
        a.details,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.admin_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 200
    `);

    return res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Admin audit log error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to load audit logs.',
    });
  }
}

module.exports = {
  getStats,
  getUsers,
  getReports,
  updateReport,
  getAuditLogs,
};
