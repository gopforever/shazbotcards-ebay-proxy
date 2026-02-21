require('dotenv').config();
const express = require('express');
const corsMiddleware = require('./middleware/cors');
const rateLimitMiddleware = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const ebayRoutes = require('./routes/ebay');
const tradingRoutes = require('./routes/trading');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(corsMiddleware);
app.use(rateLimitMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'shazbotcards-ebay-proxy'
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', ebayRoutes);
app.use('/trading', tradingRoutes);

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 ShazbotCards eBay Proxy running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS Origin: ${process.env.FRONTEND_URL || '*'}`);
});

module.exports = app;
