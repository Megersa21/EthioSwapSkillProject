const pool = require('../config/db');

const profileFields = `
  id,
  full_name,
  email,
  bio,
  location,
  profile_image,
  title,
  teach_skills,
  learn_skills,
  experience_level,
  availability,
  created_at
`;

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
      `SELECT ${profileFields}
       FROM public.users
       WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found.',
      });
    }

    return res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get profile error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve profile.',
    });
  }
};

// View the logged-in user's own profile
const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${profileFields}
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

    return res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get my profile error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve your profile.',
    });
  }
};

// Create or update the logged-in user's profile
const updateMyProfile = async (req, res) => {
  try {
    const {
      full_name,
      bio,
      location,
      profile_image,
      title,
      teach_skills,
      learn_skills,
      experience_level,
      availability,
    } = req.body;

    if (
      full_name !== undefined &&
      (typeof full_name !== 'string' || !full_name.trim())
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Full name must be a non-empty string.',
      });
    }

    const textFields = {
      bio,
      location,
      profile_image,
      title,
      experience_level,
      availability,
    };

    for (const [field, value] of Object.entries(textFields)) {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: `${field} must be text.`,
        });
      }
    }

    const validLevels = ['Beginner', 'Intermediate', 'Advanced'];

    if (
      experience_level !== undefined &&
      experience_level !== null &&
      !validLevels.includes(experience_level)
    ) {
      return res.status(400).json({
        status: 'error',
        message:
          'Experience level must be Beginner, Intermediate, or Advanced.',
      });
    }

    function validateSkills(value, field) {
      if (value === undefined) return null;

      if (
        !Array.isArray(value) ||
        !value.every(
          (skill) => typeof skill === 'string' && skill.trim().length > 0,
        )
      ) {
        throw new Error(`${field} must be an array of non-empty skill names.`);
      }

      return [...new Set(value.map((skill) => skill.trim()))];
    }

    let teachSkills;
    let learnSkills;

    try {
      teachSkills = validateSkills(teach_skills, 'teach_skills');
      learnSkills = validateSkills(learn_skills, 'learn_skills');
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    const result = await pool.query(
      `UPDATE public.users
       SET
         full_name = COALESCE($1, full_name),
         bio = COALESCE($2, bio),
         location = COALESCE($3, location),
         profile_image = COALESCE($4, profile_image),
         title = COALESCE($5, title),
         teach_skills = COALESCE($6::text[], teach_skills),
         learn_skills = COALESCE($7::text[], learn_skills),
         experience_level = COALESCE($8, experience_level),
         availability = COALESCE($9, availability),
         updated_at = NOW()
       WHERE id = $10
       RETURNING ${profileFields}`,
      [
        full_name === undefined ? null : full_name.trim(),
        bio === undefined ? null : bio,
        location === undefined ? null : location,
        profile_image === undefined ? null : profile_image,
        title === undefined ? null : title,
        teachSkills,
        learnSkills,
        experience_level === undefined ? null : experience_level,
        availability === undefined ? null : availability,
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
      message: 'Profile saved successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to save profile.',
    });
  }
};

module.exports = {
  getProfile,
  getMyProfile,
  updateMyProfile,
};
