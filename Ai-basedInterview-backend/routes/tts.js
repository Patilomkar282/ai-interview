const express = require('express');
const router = express.Router();
const polly = require('../config/polly');
const authenticate = require('../middleware/auth');

const MAX_TTS_LENGTH = 3000; // characters

const ALLOWED_VOICES = [
  'Matthew', 'Brian', 'Olivia', 'Amy', 'Joanna', 'Salli',
  'Kimberly', 'Kendra', 'Joey', 'Justin', 'Kevin', 'Ivy',
  'Ruth', 'Stephen', 'Lupe', 'Aria', 'Ayanda', 'Emma', 'Raveena'
];

const ALLOWED_FORMATS = ['mp3', 'ogg_vorbis', 'pcm'];

// GET /tts — requires authentication to prevent cost abuse
router.get('/tts', authenticate, async (req, res) => {
  const text = req.query.text;
  const voiceId = req.query.voice || 'Matthew';
  const format = req.query.format || 'mp3';
  const isSSML = req.query.ssml === 'true';

  if (!text) {
    return res.status(400).json({ error: 'Text query parameter is required.' });
  }

  if (text.length > MAX_TTS_LENGTH) {
    return res.status(400).json({ error: `Text must be ${MAX_TTS_LENGTH} characters or fewer.` });
  }

  if (!ALLOWED_VOICES.includes(voiceId)) {
    return res.status(400).json({ error: 'Invalid voice ID.' });
  }

  if (!ALLOWED_FORMATS.includes(format)) {
    return res.status(400).json({ error: 'Invalid audio format.' });
  }

  const params = {
    OutputFormat: format,
    Text: text,
    TextType: isSSML ? 'ssml' : 'text',
    VoiceId: voiceId,
    Engine: 'neural'
  };

  try {
    const pollyResponse = await polly.synthesizeSpeech(params).promise();

    if (pollyResponse.AudioStream instanceof Buffer) {
      res.set({
        'Content-Type': `audio/${format}`,
        'Content-Disposition': `inline; filename="speech.${format}"`,
        'Cache-Control': 'no-cache'
      });
      res.send(pollyResponse.AudioStream);
    } else {
      res.status(500).json({ error: 'Invalid Polly response.' });
    }
  } catch (err) {
    console.error('[TTS] Polly error:', err);
    res.status(500).json({ error: 'Failed to synthesize speech.' });
  }
});

module.exports = router;
