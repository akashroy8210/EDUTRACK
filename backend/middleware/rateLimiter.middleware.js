const requests = new Map();

// Periodically clean up expired IP records to prevent memory leaks (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requests.entries()) {
    if (now > record.resetTime) {
      requests.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

function rateLimiterMiddleware(maxRequests = 50, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const record = requests.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    requests.set(ip, record);

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      });
    }

    next();
  };
}

module.exports = {
  rateLimiterMiddleware,
};
