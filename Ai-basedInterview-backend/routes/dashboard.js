const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getStats, getHistory } = require('../controllers/dashboard');

router.get('/stats', authMiddleware, getStats);
router.get('/history', authMiddleware, getHistory);

module.exports = router;
