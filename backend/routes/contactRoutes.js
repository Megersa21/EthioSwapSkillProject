const express = require('express');
const pool = require('../config/db');

const router = express.Router();

const allowedTopics = [
  'General question',
  'Account or profile',
  'Skill exchange',
  'Technical problem',
  'Safety or community concern',
  'Suggestion or feedback',
];

router.post('/', async (req, res) => {
  try {
    const { name, email, topic, message } = req.body || {};

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim() : '';
    const cleanTopic = typeof topic === 'string' ? topic.trim() : '';
    const cleanMessage = typeof message === 'string' ? message.trim() : '';

    if (!cleanName || !cleanEmail || !cleanTopic || !cleanMessage) {
      return res.status(400).json({
        status: 'error',
        message: 'Please complete all required fields.',
      });
    }

    if (cleanName.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Name must be 100 characters or fewer.',
      });
    }

    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
    }

    if (!allowedTopics.includes(cleanTopic)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please select a valid contact topic.',
      });
    }

    if (cleanMessage.length > 5000) {
      return res.status(400).json({
        status: 'error',
        message: 'Message must be 5000 characters or fewer.',
      });
    }

    const result = await pool.query(
      `INSERT INTO contact_messages
        (name, email, topic, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [cleanName, cleanEmail, cleanTopic, cleanMessage],
    );

    return res.status(201).json({
      status: 'success',
      message:
        'Your message was submitted successfully. Thank you for contacting EthioSwapSkill!',
      contactId: result.rows[0].id,
    });
  } catch (error) {
    console.error('Contact form submission failed:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'We could not save your message. Please try again later.',
    });
  }
});

module.exports = router;
