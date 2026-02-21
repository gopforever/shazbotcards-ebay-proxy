const express = require('express');
const axios = require('axios');
const router = express.Router();

// Supported date range periods matching eBay Analytics API values
const ALLOWED_PERIODS = new Set(['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS']);

// Metrics to fetch from the eBay Analytics traffic report
const METRICS = [
  'CLICK_THROUGH_RATE',
  'LISTING_IMPRESSION_TOTAL',
  'LISTING_VIEWS_TOTAL',
  'TRANSACTION',
].join(',');

/**
 * POST /analytics/traffic
 * Fetch per-listing traffic data from the eBay Analytics API.
 *
 * Body: { period: 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS', environment?: string }
 * Headers: Authorization: Bearer <access_token>
 *
 * Returns normalized array of listing traffic objects.
 */
router.post('/traffic', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const { period = 'LAST_7_DAYS', environment } = req.body || {};

    if (!ALLOWED_PERIODS.has(period)) {
      return res.status(400).json({
        error: `Invalid period. Allowed values: ${[...ALLOWED_PERIODS].join(', ')}`
      });
    }

    const baseURL = environment === 'sandbox'
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';

    // eBay Analytics API requires filter= syntax with curly-brace encoded values
    // date_range must be inside the filter param, not a standalone query param
    // dimension and metric are separate top-level params
    const filter = `marketplace_ids:{EBAY_US},date_range:{${period}}`;

    const params = new URLSearchParams({
      dimension: 'LISTING',
      metric: METRICS,
      filter,
    });

    const response = await axios.get(
      `${baseURL}/sell/analytics/v1/traffic_report?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      }
    );

    const data = response.data;

    // Normalize the eBay Analytics response into a flat array of listing objects
    // eBay returns data in a dimension/metric matrix format
    const listings = normalizeTrafficReport(data);

    res.json({
      period,
      count: listings.length,
      listings,
    });

  } catch (error) {
    const ebayStatus = error.response?.status;
    const ebayData = error.response?.data;
    console.error('Analytics API error status:', ebayStatus);
    console.error('Analytics API error body:', JSON.stringify(ebayData, null, 2));
    console.error('Analytics API error message:', error.message);
    next({
      status: ebayStatus || 500,
      message:
        ebayData?.errors?.[0]?.longMessage ||
        ebayData?.errors?.[0]?.message ||
        ebayData?.message ||
        error.message ||
        'Analytics API call failed',
    });
  }
});

/**
 * Normalize the eBay Analytics traffic report response into a flat array.
 * eBay returns a complex dimension/metric matrix — we flatten it to per-listing objects.
 *
 * @param {object} data  Raw eBay Analytics API response
 * @returns {object[]}   Array of normalized listing traffic objects
 */
function normalizeTrafficReport(data) {
  if (!data || !data.dimensionValueMap) return [];

  const listings = [];
  const metricKeys = (data.metricKeys || []);

  // dimensionValueMap maps listing IDs to arrays of metric value arrays
  // Structure: { [listingId]: { [metricIndex]: value } }
  const dimensionValueMap = data.dimensionValueMap || {};

  Object.entries(dimensionValueMap).forEach(([listingId, metricValues]) => {
    // Find the listing name/title from header if available
    const headerEntry = (data.header?.dimensionValues || []).find(
      d => d.value === listingId
    );
    const title = headerEntry?.name || '';

    const listing = {
      itemId: listingId,
      title,
      // Traffic metrics — default to 0 if not present
      totalImpressions: 0,
      totalPageViews: 0,
      ctr: 0,
      quantitySold: 0,
      top20Pct: 0, // not available from Analytics API — kept for shape compatibility, always 0
    };

    // Map metric values by index to named fields
    metricKeys.forEach((metricKey, idx) => {
      const value = metricValues[idx] ?? 0;
      const num = parseFloat(value) || 0;

      switch (metricKey) {
        case 'LISTING_IMPRESSION_TOTAL':
          listing.totalImpressions = Math.round(num);
          break;
        case 'LISTING_VIEWS_TOTAL':
          listing.totalPageViews = Math.round(num);
          break;
        case 'CLICK_THROUGH_RATE':
          listing.ctr = parseFloat((num * 100).toFixed(2)); // convert decimal to percentage
          break;
        case 'TRANSACTION':
          listing.quantitySold = Math.round(num);
          break;
      }
    });

    listings.push(listing);
  });

  return listings;
}

module.exports = router;
