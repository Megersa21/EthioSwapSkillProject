const pool = require('../config/db');

// Create a skill
const createSkill = async (req, res) => {
  try {
    const { skill_name, description, skill_type, proficiency_level } = req.body;

    if (
      typeof skill_name !== 'string' ||
      !skill_name.trim() ||
      !['teach', 'learn'].includes(skill_type)
    ) {
      return res.status(400).json({
        status: 'error',
        message:
          'A skill name and valid skill type (teach or learn) are required.',
      });
    }

    const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    if (proficiency_level && !validLevels.includes(proficiency_level)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid proficiency level.',
      });
    }

    const result = await pool.query(
      `INSERT INTO public.skills
       (user_id, skill_name, description, skill_type, proficiency_level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.userId,
        skill_name.trim(),
        typeof description === 'string' ? description.trim() || null : null,
        skill_type,
        proficiency_level || null,
      ],
    );

    return res.status(201).json({
      status: 'success',
      message: 'Skill created successfully.',
      skill: result.rows[0],
    });
  } catch (error) {
    console.error('Create skill error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Could not create skill.',
    });
  }
};

// Get the logged-in user's skills from PostgreSQL
const getMySkills = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM public.skills
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId],
    );

    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      skills: result.rows,
    });
  } catch (error) {
    console.error('Get my skills error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Could not retrieve your skills.',
    });
  }
};

// Discover other members' skills and profile information
const discoverSkills = async (req, res) => {
  try {
    const { q = '', skill_type, proficiency_level } = req.query;

    const conditions = ['s.user_id <> $1'];
    const values = [req.user.userId];

    if (typeof q === 'string' && q.trim()) {
      values.push(`%${q.trim()}%`);
      const searchIndex = values.length;

      conditions.push(
        `(s.skill_name ILIKE $${searchIndex}
          OR COALESCE(s.description, '') ILIKE $${searchIndex}
          OR COALESCE(u.full_name, '') ILIKE $${searchIndex}
          OR COALESCE(u.location, '') ILIKE $${searchIndex}
          OR COALESCE(u.title, '') ILIKE $${searchIndex})`,
      );
    }

    if (skill_type) {
      if (!['teach', 'learn'].includes(skill_type)) {
        return res.status(400).json({
          status: 'error',
          message: 'skill_type must be teach or learn.',
        });
      }

      values.push(skill_type);
      conditions.push(`s.skill_type = $${values.length}`);
    }

    if (proficiency_level) {
      const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

      if (!validLevels.includes(proficiency_level)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid proficiency level.',
        });
      }

      values.push(proficiency_level);
      conditions.push(`s.proficiency_level = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT
         s.id,
         s.user_id,
         s.skill_name,
         s.description,
         s.skill_type,
         s.proficiency_level,
         s.created_at,
         u.full_name AS user_name,
         u.title,
         u.location,
         u.profile_image,
         u.availability,
         u.experience_level
       FROM public.skills s
       JOIN public.users u ON u.id = s.user_id
       WHERE ${conditions.join(' AND ')}
  AND LOWER(COALESCE(u.role, 'user')) = 'user'
  AND LOWER(COALESCE(u.account_status, 'active')) = 'active'
       ORDER BY s.created_at DESC`,
      values,
    );

    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      skills: result.rows,
    });
  } catch (error) {
    console.error('Discover skills error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Could not discover skills.',
    });
  }
};

// Update a skill owned by the logged-in user
const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skill_name, description, skill_type, proficiency_level } = req.body;

    const existing = await pool.query(
      `SELECT *
       FROM public.skills
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.userId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Skill not found or you do not own it.',
      });
    }

    const current = existing.rows[0];

    const nextName =
      skill_name === undefined
        ? current.skill_name
        : typeof skill_name === 'string'
          ? skill_name.trim()
          : '';

    const nextDescription =
      description === undefined ? current.description : description;

    const nextType = skill_type ?? current.skill_type;
    const nextLevel =
      proficiency_level === undefined
        ? current.proficiency_level
        : proficiency_level;

    if (!nextName) {
      return res.status(400).json({
        status: 'error',
        message: 'Skill name cannot be empty.',
      });
    }

    if (!['teach', 'learn'].includes(nextType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Skill type must be teach or learn.',
      });
    }

    const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    if (nextLevel !== null && !validLevels.includes(nextLevel)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid proficiency level.',
      });
    }

    if (
      nextDescription !== null &&
      nextDescription !== undefined &&
      typeof nextDescription !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Description must be text.',
      });
    }

    const result = await pool.query(
      `UPDATE public.skills
       SET skill_name = $1,
           description = $2,
           skill_type = $3,
           proficiency_level = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        nextName,
        nextDescription?.trim() || null,
        nextType,
        nextLevel || null,
        id,
        req.user.userId,
      ],
    );

    return res.status(200).json({
      status: 'success',
      message: 'Skill updated successfully.',
      skill: result.rows[0],
    });
  } catch (error) {
    console.error('Update skill error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Could not update skill.',
    });
  }
};

// Delete a skill owned by the logged-in user
const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM public.skills
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Skill not found or you do not own it.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Skill deleted successfully.',
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Could not delete skill.',
    });
  }
};

module.exports = {
  createSkill,
  getMySkills,
  discoverSkills,
  updateSkill,
  deleteSkill,
};
