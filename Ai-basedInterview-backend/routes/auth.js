const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendOtp, verifyOtp, onboardUser, smtpTest } = require('../controllers/auth');
const authenticate = require('../middleware/auth');

// Strict rate limit for OTP sending
const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many OTP requests. Please wait 15 minutes before trying again.' }
});

// Strict rate limit for OTP verification (prevents brute force)
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many verification attempts. Please wait before trying again.' }
});

router.post('/send-otp', sendOtpLimiter, sendOtp);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);
router.post('/onboard', authenticate, onboardUser);
// DEV ONLY — remove before production
router.get('/smtp-test', smtpTest);

module.exports = router;
