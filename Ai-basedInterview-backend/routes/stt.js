const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');

// GET /api/deepgram-key — requires authentication (key must never be public)
router.get('/deepgram-key', authenticate, (req, res) => {
  const key = process.env.DEEPGRAM_KEY;
  if (!key) return res.status(500).json({ error: 'STT service not configured.' });
  res.status(200).json({ key });
});

module.exports = router;
