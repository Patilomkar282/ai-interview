const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const sessionLimit = require('../middleware/sessionLimit');
const { startInterview, checkAnswer, getFinalFeedback, getReport } = require('../controllers/interview');

// Start requires auth + session limit check
router.post('/start', authMiddleware, sessionLimit, startInterview);

// Check answer requires auth only
router.post('/check', authMiddleware, checkAnswer);

// Get final feedback
router.get('/final-feedback', authMiddleware, getFinalFeedback);

// Get saved report by ID
router.get('/report/:id', authMiddleware, getReport);

module.exports = router;
