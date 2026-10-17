const pool = require('../config/db');

// View a user's public profile
const getProfile = async (req, res) => {
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
         u.id,
         u.full_name,
         u.email,
         u.bio,
         u.location,
         u.profile_image,
         u.created_at
       FROM public.users u
       WHERE u.id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found.',
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve profile.',
    });
  }
};

// View the logged-in user's own profile
const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         full_name,
         email,
         bio,
         location,
         profile_image,
         created_at
       FROM public.users
       WHERE id = $1`,
      [req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found.',
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve your profile.',
    });
  }
};

// Update the logged-in user's profile
const updateMyProfile = async (req, res) => {
  try {
    const { full_name, bio, location, profile_image } = req.body;

    if (
      full_name !== undefined &&
      (typeof full_name !== 'string' || !full_name.trim())
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Full name must be a non-empty string.',
      });
    }

    for (const [field, value] of Object.entries({
      bio,
      location,
      profile_image,
    })) {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: `${field} must be text.`,
        });
      }
    }

    const result = await pool.query(
      `UPDATE public.users
       SET
         full_name = COALESCE($1, full_name),
         bio = COALESCE($2, bio),
         location = COALESCE($3, location),
         profile_image = COALESCE($4, profile_image)
       WHERE id = $5
       RETURNING
         id, full_name, email, bio, location, profile_image, created_at`,
      [
        full_name === undefined ? null : full_name.trim(),
        bio === undefined ? null : bio,
        location === undefined ? null : location,
        profile_image === undefined ? null : profile_image,
        req.user.userId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found.',
      });
    }

    return res.json({
      status: 'success',
      message: 'Profile updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update profile.',
    });
  }
};

module.exports = {
  getProfile,
  getMyProfile,
  updateMyProfile,
};
