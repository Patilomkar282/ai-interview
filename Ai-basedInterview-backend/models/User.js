const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/@mmcoe\.edu\.in$/, 'Only @mmcoe.edu.in emails are allowed']
  },
  name: {
    type: String,
    trim: true,
    default: '',
    maxlength: 100
  },
  isOnboarded: {
    type: Boolean,
    default: false
  },
  interests: {
    type: [String],
    default: []
  },
  otpHash: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  sessionsThisMonth: {
    type: Number,
    default: 0
  },
  monthResetDate: {
    type: Date,
    default: () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  },
  lastInterviewDate: {
    type: Date,
    default: null
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { strict: false });

// Reset session count if we're in a new month
userSchema.methods.checkAndResetMonthlyLimit = function () {
  const now = new Date();
  if (now >= this.monthResetDate) {
    this.sessionsThisMonth = 0;
    this.monthResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
};

module.exports = mongoose.model('User', userSchema);
