const User = require('../models/User');

const sessionLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check and reset monthly limit if needed
    user.checkAndResetMonthlyLimit();
    await user.save();

    if (user.sessionsThisMonth >= 5) {
      return res.status(429).json({
        error: 'Monthly session limit reached.',
        message: 'You have used all 5 interview sessions for this month. Please try again next month.',
        sessionsUsed: user.sessionsThisMonth,
        resetDate: user.monthResetDate
      });
    }

    req.userDoc = user; // Attach for later use in controller
    next();
  } catch (err) {
    console.error('[SessionLimit] Check error:', err);
    res.status(500).json({ error: 'Failed to check session limit.' });
  }
};

module.exports = sessionLimit;
