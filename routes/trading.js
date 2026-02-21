const express = require('express');
const eBayAPI = require('../utils/ebayAPI');
const router = express.Router();

// Allowlist of Trading API calls supported by this endpoint
const ALLOWED_CALLS = new Set([
  'GetMyeBaySelling',
  'GetMyeBayBuying',
  'GetSellerList',
  'GetItem',
  'GetOrders'
]);

// Default request body for GetMyeBaySelling – fetches active, sold, and unsold listings
const DEFAULT_SELLING_BODY = {
  ActiveList: {
    Include: true,
    Pagination: { EntriesPerPage: 200, PageNumber: 1 }
  },
  SoldList: {
    Include: true,
    Pagination: { EntriesPerPage: 200, PageNumber: 1 }
  },
  UnsoldList: {
    Include: true,
    Pagination: { EntriesPerPage: 200, PageNumber: 1 }
  }
};

// POST /trading/sync – proxy a Trading API call server-to-server
router.post('/sync', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const { callName = 'GetMyeBaySelling', body, environment, pageNumber } = req.body || {};

    if (!ALLOWED_CALLS.has(callName)) {
      return res.status(400).json({
        error: `Unsupported callName. Allowed values: ${[...ALLOWED_CALLS].join(', ')}`
      });
    }

    // Build the body: caller-supplied overrides take precedence over defaults
    let requestBody = body;
    if (!requestBody && callName === 'GetMyeBaySelling') {
      requestBody = { ...DEFAULT_SELLING_BODY };
      // Support a top-level pageNumber shorthand for simple pagination
      if (pageNumber) {
        const pagination = { EntriesPerPage: 200, PageNumber: pageNumber };
        requestBody.ActiveList.Pagination = pagination;
        requestBody.SoldList.Pagination = pagination;
        requestBody.UnsoldList.Pagination = pagination;
      }
    }

    const api = new eBayAPI({
      token,
      environment: environment || 'production',
      useIAFToken: true
    });

    const result = await api.makeCall(callName, requestBody || {});
    res.json(result);

  } catch (error) {
    console.error('Trading API error:', error.message);
    next({
      status: error.status || 500,
      message: error.message || 'Trading API call failed',
      ...(error.ebayErrors ? { ebayErrors: error.ebayErrors } : {})
    });
  }
});

module.exports = router;
