const pool = require('../config/db');

// ------------------------------------------
// GET ADMIN DASHBOARD STATISTICS
// ------------------------------------------
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

// ------------------------------------------
// GET ALL USERS
// ------------------------------------------
async function getUsers(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        role,
        account_status,
        created_at,
        updated_at,
        location,
        title
      FROM public.users
      ORDER BY created_at DESC
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

// ------------------------------------------
// SUSPEND OR REACTIVATE A USER
// PATCH /api/admin/users/:id/status
// ------------------------------------------
async function updateUserStatus(req, res) {
  const userId = req.params.id;

  // Support either field name from the frontend.
  const requestedStatus = req.body.account_status ?? req.body.status;

  const allowedStatuses = ['active', 'suspended'];

  if (!userId || !/^\d+$/.test(String(userId)) || Number(userId) < 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user ID.',
    });
  }

  if (!allowedStatuses.includes(requestedStatus)) {
    return res.status(400).json({
      status: 'error',
      message: 'Status must be active or suspended.',
    });
  }

  // An administrator cannot suspend their own account.
  if (String(req.user.userId) === String(userId)) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot change your own account status.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const targetResult = await client.query(
      `SELECT id, full_name, email, role, account_status
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    if (targetResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    const target = targetResult.rows[0];

    // Protect super administrator accounts from suspension.
    if (target.role === 'super_admin') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        status: 'error',
        message: 'A super administrator account cannot be suspended here.',
      });
    }

    const updated = await client.query(
      `UPDATE public.users
       SET account_status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING
         id,
         full_name,
         email,
         role,
         account_status,
         created_at,
         updated_at,
         location,
         title`,
      [requestedStatus, userId],
    );

    await client.query(
      `INSERT INTO audit_logs
         (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        req.user.userId,
        requestedStatus === 'suspended' ? 'user_suspended' : 'user_reactivated',
        'user',
        userId,
        JSON.stringify({
          previousStatus: target.account_status,
          newStatus: requestedStatus,
          targetEmail: target.email,
        }),
      ],
    );

    await client.query('COMMIT');

    return res.json({
      status: 'success',
      message:
        requestedStatus === 'suspended'
          ? 'User suspended successfully.'
          : 'User reactivated successfully.',
      user: updated.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update user status error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to update user status.',
    });
  } finally {
    client.release();
  }
}

// ------------------------------------------
// CHANGE A USER'S ROLE
// PATCH /api/admin/users/:id/role
// ------------------------------------------
async function updateUserRole(req, res) {
  const userId = req.params.id;
  const { role: requestedRole } = req.body;

  const allowedRoles = ['user', 'admin', 'super_admin'];

  if (!userId || !/^\d+$/.test(String(userId)) || Number(userId) < 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user ID.',
    });
  }

  if (!allowedRoles.includes(requestedRole)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid role.',
    });
  }

  // Only super administrators may change roles.
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Only a super administrator can change user roles.',
    });
  }

  // Prevent changing your own role and accidentally losing access.
  if (String(req.user.userId) === String(userId)) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot change your own role.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const targetResult = await client.query(
      `SELECT id, full_name, email, role, account_status
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    if (targetResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    const target = targetResult.rows[0];

    // Do not allow removal of the last super administrator.
    if (target.role === 'super_admin' && requestedRole !== 'super_admin') {
      const superAdminCount = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM public.users
         WHERE role = 'super_admin'`,
      );

      if (superAdminCount.rows[0].count <= 1) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          status: 'error',
          message: 'You cannot remove the last super administrator.',
        });
      }
    }

    const updated = await client.query(
      `UPDATE public.users
       SET role = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING
         id,
         full_name,
         email,
         role,
         account_status,
         created_at,
         updated_at,
         location,
         title`,
      [requestedRole, userId],
    );

    await client.query(
      `INSERT INTO audit_logs
         (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        req.user.userId,
        'user_role_updated',
        'user',
        userId,
        JSON.stringify({
          previousRole: target.role,
          newRole: requestedRole,
          targetEmail: target.email,
        }),
      ],
    );

    await client.query('COMMIT');

    return res.json({
      status: 'success',
      message: 'User role updated successfully.',
      user: updated.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update user role error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to update user role.',
    });
  } finally {
    client.release();
  }
}
// ------------------------------------------
// DELETE A USER PERMANENTLY
// DELETE /api/admin/users/:id
// ------------------------------------------
async function deleteUser(req, res) {
  const userId = req.params.id;

  if (!/^\d+$/.test(String(userId)) || Number(userId) < 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user ID.',
    });
  }

  // Never allow an administrator to delete their own account.
  if (String(req.user.userId) === String(userId)) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot delete your own account.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const targetResult = await client.query(
      `SELECT id, full_name, email, role, account_status
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    if (targetResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    const target = targetResult.rows[0];

    // Never delete a super administrator through this endpoint.
    if (target.role === 'super_admin') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        status: 'error',
        message: 'Super administrator accounts are protected.',
      });
    }

    // Only the super administrator may delete another administrator.
    if (target.role === 'admin' && req.user.role !== 'super_admin') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        status: 'error',
        message:
          'Only a super administrator can delete administrator accounts.',
      });
    }

    // Delete the account. If related records prevent deletion,
    // PostgreSQL will reject the operation and the transaction rolls back.
    const deleted = await client.query(
      `DELETE FROM public.users
       WHERE id = $1
       RETURNING id, full_name, email, role`,
      [userId],
    );

    // Record the action in the audit log.
    await client.query(
      `INSERT INTO audit_logs
         (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        req.user.userId,
        'user_deleted',
        'user',
        userId,
        JSON.stringify({
          deletedUserId: target.id,
          deletedUserName: target.full_name,
          deletedUserEmail: target.email,
          deletedUserRole: target.role,
        }),
      ],
    );

    await client.query('COMMIT');

    return res.json({
      status: 'success',
      message: 'User deleted successfully.',
      user: deleted.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Delete user error:', error.message);

    // Related records may have foreign keys that block deletion.
    if (error.code === '23503') {
      return res.status(409).json({
        status: 'error',
        message:
          'This user has related records that prevent permanent deletion. Suspend the account instead, or review the database relationships before deleting.',
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete user.',
    });
  } finally {
    client.release();
  }
}
// ------------------------------------------
// GET REPORTS
// ------------------------------------------
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

// ------------------------------------------
// UPDATE REPORT
// ------------------------------------------
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

// ------------------------------------------
// GET AUDIT LOGS
// ------------------------------------------
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
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getReports,
  updateReport,
  getAuditLogs,
};
