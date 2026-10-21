const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const crypto = require('crypto');

async function register(req, res) {
  try {
    const { full_name, email, password } = req.body || {};

    if (
      typeof full_name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Full name, email, and password are required.',
      });
    }

    const cleanName = full_name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Full name must be between 1 and 100 characters.',
      });
    }

    if (
      cleanEmail.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be between 8 and 72 characters.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration always creates an ordinary user account.
    // Never accept a role supplied by the client.
    const result = await pool.query(
      `INSERT INTO public.users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, role, created_at`,
      [cleanName, cleanEmail, passwordHash],
    );

    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.',
      });
    }

    console.error('Registration error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to create your account right now.',
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT
          id,
          full_name,
          email,
          password_hash,
          role,
          account_status,
          token_version
       FROM public.users
       WHERE email = $1`,
      [cleanEmail],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is not active. Please contact support.',
        accountStatus: user.account_status,
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing from backend/.env');

      return res.status(500).json({
        status: 'error',
        message: 'Authentication is not configured.',
      });
    }

    const tokenVersion = Number(user.token_version);

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    return res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to log in right now.',
    });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const userId = req.user.userId;

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
        message:
          'Your new password must be different from your current password.',
      });
    }

    // Load the current password hash and security version.
    const result = await pool.query(
      `SELECT password_hash
       FROM public.users
       WHERE id = $1`,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User account not found.',
      });
    }

    // Verify the current password before changing it.
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );

    if (!passwordMatches) {
      return res.status(400).json({
        status: 'error',
        message: 'Your current password is incorrect.',
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Save the new password and invalidate previously issued tokens.
    await pool.query(
      `UPDATE public.users
       SET password_hash = $1,
           token_version = COALESCE(token_version, 0) + 1
       WHERE id = $2`,
      [newPasswordHash, userId],
    );

    return res.status(200).json({
      status: 'success',
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    console.error('Change password error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to change your password right now.',
    });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter your email address.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, email, full_name
       FROM public.users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail],
    );

    // Use the same response whether or not the account exists.
    const message =
      'If an account exists for this email, password-reset instructions will be sent.';

    if (result.rows.length === 0) {
      return res.status(200).json({ status: 'success', message });
    }

    const user = result.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const clientUrl = (
      process.env.CLIENT_URL || 'http://localhost:5173'
    ).replace(/\/+$/, '');

    const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await pool.query(
      `UPDATE public.password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id],
    );

    await pool.query(
      `INSERT INTO public.password_reset_tokens
       (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '20 minutes')`,
      [user.id, tokenHash],
    );

    try {
      const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'EthioSwapSkill',
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [
            {
              email: user.email,
              name: user.full_name || user.email,
            },
          ],
          subject: 'Reset your EthioSwapSkill password',
          textContent:
            `Hello ${user.full_name || 'there'},\n\n` +
            `Use this link to reset your password. It expires in 20 minutes:\n` +
            `${resetUrl}\n\n` +
            'If you did not request this, you can ignore this email.',
        }),
      });

      if (!emailResponse.ok) {
        const details = await emailResponse.text();
        console.error('Brevo email error:', emailResponse.status, details);

        await pool.query(
          `UPDATE public.password_reset_tokens
           SET used_at = NOW()
           WHERE token_hash = $1`,
          [tokenHash],
        );
      }
    } catch (emailError) {
      console.error('Brevo request failed:', emailError.message);

      await pool.query(
        `UPDATE public.password_reset_tokens
         SET used_at = NOW()
         WHERE token_hash = $1`,
        [tokenHash],
      );
    }

    return res.status(200).json({ status: 'success', message });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to process your request right now.',
    });
  }
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body || {};

  if (
    typeof token !== 'string' ||
    !token ||
    typeof newPassword !== 'string' ||
    newPassword.length < 8 ||
    newPassword.length > 72
  ) {
    return res.status(400).json({
      status: 'error',
      message:
        'A valid reset token and a password of 8–72 characters are required.',
    });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, user_id
       FROM public.password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message:
          'This reset link is invalid or expired. Please request a new one.',
      });
    }

    const resetRecord = result.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await client.query(
      `UPDATE public.users
       SET password_hash = $1,
           token_version = COALESCE(token_version, 0) + 1
       WHERE id = $2`,
      [passwordHash, resetRecord.user_id],
    );

    await client.query(
      `UPDATE public.password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [resetRecord.user_id],
    );

    await client.query('COMMIT');

    return res.status(200).json({
      status: 'success',
      message:
        'Password reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset password error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to reset your password right now.',
    });
  } finally {
    client.release();
  }
}

module.exports = {
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
};
