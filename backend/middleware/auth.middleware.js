const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('./error.middleware');

function authMiddleware(req, res, next) {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Authentication token required.', 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Authentication token has expired. Please log in again.', 'TOKEN_EXPIRED'));
    }
    return next(new ApiError(401, 'Invalid authentication token.', 'INVALID_TOKEN'));
  }
}

module.exports = {
  authMiddleware,
};
