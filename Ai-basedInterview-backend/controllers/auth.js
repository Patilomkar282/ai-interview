const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');

// Configure SMTP transporter
// NOTE: dotenv.config() must be called before this module is require()'d
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    // Gmail App Password — spaces are stripped automatically by nodemailer
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, '') : undefined
  }
});

// Verify SMTP connection on startup so misconfiguration is caught early
transporter.verify((err) => {
  if (err) {
    console.error('[SMTP] Connection failed — OTP emails will not send:', err.message);
  } else {
    console.log('[SMTP] Ready to send emails via', process.env.SMTP_USER);
  }
});

// Generate a cryptographically secure 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Escape HTML characters to prevent XSS in email body
const escapeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email domain
    if (!email || typeof email !== 'string' || !email.trim().endsWith('@mmcoe.edu.in')) {
      return res.status(400).json({
        error: 'Only @mmcoe.edu.in email addresses are allowed.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate OTP and hash it
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Find or create user — reset attempts on new OTP request
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      user.otpHash = otpHash;
      user.otpExpiry = otpExpiry;
      user.otpAttempts = 0; // Reset attempt counter on new OTP
    } else {
      user = new User({
        email: normalizedEmail,
        otpHash,
        otpExpiry,
        otpAttempts: 0
      });
    }
    await user.save();

    // Send OTP email (name is escaped to prevent HTML injection)
    const safeName = escapeHtml(user.name || 'Candidate');
    await transporter.sendMail({
      from: `"AI Interview Platform" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject: 'Your Interview Platform Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #4F46E5; margin-bottom: 16px;">AI Interview Platform</h2>
          <p>Hello <strong>${safeName}</strong>,</p>
          <p>Your one-time password (OTP) for login is:</p>
          <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 16px; border-radius: 12px; letter-spacing: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6B7280; font-size: 14px;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
          <p style="color: #9CA3AF; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    });

    res.json({ message: 'OTP sent to your email.', email: normalizedEmail });

  } catch (err) {
    console.error('[Auth] Error sending OTP:', err);
    const detail = process.env.NODE_ENV !== 'production' ? ` (${err.message})` : '';
    res.status(500).json({ error: `Failed to send OTP. Please try again.${detail}` });
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.otpHash || !user.otpExpiry) {
      return res.status(400).json({ error: 'No OTP request found. Please request a new OTP.' });
    }

    // Check expiry first (before incrementing attempts)
    if (new Date() > user.otpExpiry) {
      user.otpHash = null;
      user.otpExpiry = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Lock after 5 failed attempts
    const MAX_ATTEMPTS = 5;
    if (user.otpAttempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) {
      user.otpAttempts += 1;
      await user.save();
      const remaining = MAX_ATTEMPTS - user.otpAttempts;
      return res.status(400).json({
        error: remaining > 0
          ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Clear OTP fields on success
    user.otpHash = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;

    // Check and reset monthly limit
    user.checkAndResetMonthlyLimit();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnboarded: user.isOnboarded,
        sessionsThisMonth: user.sessionsThisMonth,
        sessionsRemaining: Math.max(0, 5 - user.sessionsThisMonth)
      }
    });

  } catch (err) {
    console.error('[Auth] Error verifying OTP:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

// POST /api/auth/onboard
const onboardUser = async (req, res) => {
  try {
    const { name, interests } = req.body;
    const userId = req.user.userId;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please provide a valid full name (at least 2 characters).' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or fewer.' });
    }

    // Validate interests
    let sanitizedInterests = [];
    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return res.status(400).json({ error: 'Interests must be an array.' });
      }
      if (interests.length > 10) {
        return res.status(400).json({ error: 'You can specify at most 10 interests.' });
      }
      sanitizedInterests = interests
        .filter(i => typeof i === 'string' && i.trim().length > 0)
        .map(i => i.trim().slice(0, 50)); // max 50 chars per interest
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.name = name.trim();
    user.interests = sanitizedInterests;
    user.isOnboarded = true;
    await user.save();

    // Re-issue JWT with updated name
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Onboarding complete',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnboarded: user.isOnboarded,
        sessionsThisMonth: user.sessionsThisMonth,
        sessionsRemaining: Math.max(0, 5 - user.sessionsThisMonth)
      }
    });

  } catch (err) {
    console.error('[Auth] Error onboarding:', err);
    res.status(500).json({ error: 'Failed to save profile. Please try again.' });
  }
};

// GET /api/auth/smtp-test — DEV ONLY, remove before production
const smtpTest = async (req, res) => {
  try {
    await transporter.verify();
    res.json({
      ok: true,
      user: process.env.SMTP_USER,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      passLoaded: !!process.env.SMTP_PASS
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      user: process.env.SMTP_USER,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      passLoaded: !!process.env.SMTP_PASS
    });
  }
};

module.exports = { sendOtp, verifyOtp, onboardUser, smtpTest };
