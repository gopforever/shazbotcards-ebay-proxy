const express = require('express');
const eBayAPI = require('../utils/ebayAPI');
const router = express.Router();

// Proxy eBay API calls
router.post('/ebay', async (req, res, next) => {
  try {
    const { apiCall, body, environment } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    if (!apiCall) {
      return res.status(400).json({ error: 'API call name required' });
    }

    const api = new eBayAPI({
      token,
      environment: environment || 'production'
    });

    const result = await api.makeCall(apiCall, body);
    res.json(result);

  } catch (error) {
    console.error('eBay API error:', error.message);
    next({
      status: error.status || 500,
      message: error.message || 'eBay API call failed'
    });
  }
});

module.exports = router;
