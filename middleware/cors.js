const cors = require('cors');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://gopforever.github.io';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests from frontend or no origin (same-origin)
    if (!origin || origin === FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
