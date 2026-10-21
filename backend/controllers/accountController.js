const bcrypt = require('bcrypt');
const pool = require('../config/db');

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getSettings(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         id, full_name, email, role, account_status,
         account_preferences, location, title, bio,
         created_at, updated_at
       FROM public.users
       WHERE id = $1`,
      [req.user.userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Account not found.',
      });
    }

    return res.json({
      status: 'success',
      settings: result.rows[0],
    });
  } catch (error) {
    console.error('Get account settings error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to load account settings.',
    });
  }
}

async function updateProfile(req, res) {
  try {
    const { full_name, email, location, title, bio } = req.body || {};
    const updates = [];
    const values = [];
    let index = 1;

    if (full_name !== undefined) {
      if (
        typeof full_name !== 'string' ||
        !full_name.trim() ||
        full_name.trim().length > 100
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Full name must be between 1 and 100 characters.',
        });
      }

      updates.push(`full_name = $${index++}`);
      values.push(full_name.trim());
    }

    if (email !== undefined) {
      if (
        typeof email !== 'string' ||
        email.trim().length > 255 ||
        !validEmail(email.trim())
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide a valid email address.',
        });
      }

      updates.push(`email = $${index++}`);
      values.push(email.trim().toLowerCase());
    }

    for (const [field, value, maxLength] of [
      ['location', location, 150],
      ['title', title, 150],
      ['bio', bio, 2000],
    ]) {
      if (value !== undefined) {
        if (
          value !== null &&
          (typeof value !== 'string' || value.length > maxLength)
        ) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid ${field}. Maximum length: ${maxLength}.`,
          });
        }

        updates.push(`${field} = $${index++}`);
        values.push(value === null ? null : value.trim());
      }
    }

    if (!updates.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Provide at least one field to update.',
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.userId);

    const result = await pool.query(
      `UPDATE public.users
       SET ${updates.join(', ')}
       WHERE id = $${index}
       RETURNING id, full_name, email, role, location, title, bio, updated_at`,
      values,
    );

    if (!result.rows.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Account not found.',
      });
    }

    return res.json({
      status: 'success',
      message: 'Account details updated successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        status: 'error',
        message: 'That email address is already in use.',
      });
    }

    console.error('Update account profile error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to update account details.',
    });
  }
}

async function updatePreferences(req, res) {
  try {
    const { preferences } = req.body || {};

    if (
      !preferences ||
      typeof preferences !== 'object' ||
      Array.isArray(preferences)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Preferences must be a JSON object.',
      });
    }

    // Prevent settings from being used to change protected account fields.
    const blockedKeys = [
      'role',
      'account_status',
      'token_version',
      'password',
      'password_hash',
    ];

    if (blockedKeys.some((key) => Object.hasOwn(preferences, key))) {
      return res.status(400).json({
        status: 'error',
        message: 'Preferences contain a protected field.',
      });
    }

    const result = await pool.query(
      `UPDATE public.users
       SET account_preferences = account_preferences || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING account_preferences`,
      [JSON.stringify(preferences), req.user.userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Account not found.',
      });
    }

    return res.json({
      status: 'success',
      message: 'Preferences saved successfully.',
      preferences: result.rows[0].account_preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to save preferences.',
    });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    !currentPassword ||
    !newPassword
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Current password and new password are required.',
    });
  }

  if (newPassword.length < 8 || newPassword.length > 72) {
    return res.status(400).json({
      status: 'error',
      message: 'New password must be between 8 and 72 characters.',
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      status: 'error',
      message: 'Your new password must differ from your current password.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, password_hash
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [req.user.userId],
    );

    const user = result.rows[0];

    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Account not found.',
      });
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);

    if (!matches) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Your current password is incorrect.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await client.query(
      `UPDATE public.users
       SET password_hash = $1,
           token_version = token_version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, user.id],
    );

    await client.query('COMMIT');

    return res.json({
      status: 'success',
      message: 'Password changed successfully. Please log in again.',
      requiresLogin: true,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Change password error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to change your password.',
    });
  } finally {
    client.release();
  }
}

async function deactivateAccount(req, res) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE public.users
       SET account_status = 'deactivated',
           token_version = token_version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND account_status = 'active'
       RETURNING id`,
      [req.user.userId],
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Account is not active or could not be found.',
      });
    }

    await client.query(
      `INSERT INTO public.audit_logs
         (admin_id, action, target_type, target_id, details)
       VALUES (NULL, $1, $2, $3, $4::jsonb)`,
      [
        'self_deactivate_account',
        'user',
        req.user.userId,
        JSON.stringify({ initiatedBy: 'account_owner' }),
      ],
    );

    await client.query('COMMIT');

    return res.json({
      status: 'success',
      message: 'Your account has been deactivated.',
      requiresLogout: true,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Deactivate account error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to deactivate your account.',
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getSettings,
  updateProfile,
  updatePreferences,
  changePassword,
  deactivateAccount,
};
