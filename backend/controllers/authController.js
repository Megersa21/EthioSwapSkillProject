const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

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

module.exports = { register, login };
