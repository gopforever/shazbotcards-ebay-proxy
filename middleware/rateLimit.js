const rateLimit = require('express-rate-limit');

// Limit to 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Suppresses the express-rate-limit ValidationError warning when trust proxy is
  // already configured via app.set('trust proxy', 1) in server.js
  validate: { trustProxy: false },
});

module.exports = limiter;
