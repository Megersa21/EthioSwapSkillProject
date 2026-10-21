const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required. Please log in.',
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication token is missing.',
    });
  }

  let decoded;

  // Step 1: Verify the JWT signature and expiration.
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing from backend/.env');

      return res.status(500).json({
        status: 'error',
        message: 'Authentication is not configured.',
      });
    }

    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token. Please log in again.',
    });
  }

  if (!decoded.userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid authentication token.',
    });
  }

  // Step 2: Load the user's current account information from PostgreSQL.
  try {
    const result = await pool.query(
      `SELECT id, role, account_status, token_version
       FROM public.users
       WHERE id = $1`,
      [decoded.userId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Account not found. Please log in again.',
      });
    }

    // Reject accounts that are not active.
    if (user.account_status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is not active. Please contact support.',
        accountStatus: user.account_status,
      });
    }

    // Reject tokens created before a security-sensitive account change.
    const tokenVersion = Number(decoded.tokenVersion ?? 0);
    const currentVersion = Number(user.token_version);

    if (!Number.isInteger(tokenVersion) || tokenVersion !== currentVersion) {
      return res.status(401).json({
        status: 'error',
        message: 'Your session is no longer valid. Please log in again.',
      });
    }

    // Always trust the current database role, not the role in the JWT.
    req.user = {
      userId: user.id,
      role: user.role,
      accountStatus: user.account_status,
      tokenVersion: currentVersion,
    };

    return next();
  } catch (error) {
    console.error('Authentication database error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to verify your account right now.',
    });
  }
}

module.exports = authMiddleware;
