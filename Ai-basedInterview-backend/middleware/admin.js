const jwt = require('jsonwebtoken');

const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required before checking admin role.' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server error while checking admin privileges.' });
  }
};

module.exports = adminMiddleware;
