const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { getOverallStats, getRecentInterviews, getInterviewDetails } = require('../controllers/adminController');

// Apply auth and admin middleware to all routes in this file
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', getOverallStats);
router.get('/interviews', getRecentInterviews);
router.get('/interviews/:id/feedback', getInterviewDetails);

module.exports = router;
