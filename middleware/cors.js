const cors = require('cors');

// Build the allowlist from ALLOWED_ORIGINS (comma-separated) with sensible defaults.
// FRONTEND_URL is kept for backwards-compatibility and is merged into the list.
// Evaluated once at startup; restart the server to pick up env var changes.
const buildAllowedOrigins = () => {
  const set = new Set([
    'https://projectebay.netlify.app',
    'http://localhost:8888',
    'http://localhost:3000'
  ]);

  if (process.env.FRONTEND_URL) {
    set.add(process.env.FRONTEND_URL);
  }

  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean).forEach(o => set.add(o));
  }

  return set;
};

const allowedOrigins = buildAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin requests (no Origin header) or whitelisted origins
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
