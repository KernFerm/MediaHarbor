const rateLimit = require('express-rate-limit');

function createRateLimiter() {
  return rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 60),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests. Slow down and try again later.'
    },
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Request throttled temporarily to protect service availability.'
      });
    }
  });
}

module.exports = {
  createRateLimiter
};
