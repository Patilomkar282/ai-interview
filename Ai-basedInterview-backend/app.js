// Load env vars FIRST — before any other require() so module-level code
// (e.g. nodemailer.createTransport in auth.js) can read process.env values
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const connectDB = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const ttsRoutes = require('./routes/tts');
const sttRoute = require('./routes/stt');
const interviewRoutes = require('./routes/interview');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const app = express();

// Connect to MongoDB
connectDB();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: { error: 'Too many requests. Please try again later.' }
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 OTP requests per 15 min
  message: { error: 'Too many OTP requests. Please wait before trying again.' }
});

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['x-interview-ended', 'x-interview-id', 'x-question-text', 'x-ai-text', 'x-difficulty']
}));

// Body parser
app.use(express.json({ limit: '1mb' }));

// Session (kept for backward compatibility, main auth uses JWT)
app.use(session({
  secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET env variable is required'); })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 30,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
    httpOnly: true
  }
}));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/tts', ttsRoutes);
app.use('/api', sttRoute);
app.use('/api/interview', interviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
