const express = require('express');
const axios = require('axios');
const router = express.Router();

const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;
const EBAY_RU_NAME = process.env.EBAY_RU_NAME;
const FRONTEND_URL = process.env.FRONTEND_URL;

const OAUTH_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.ebay.com/identity/v1'
  : 'https://api.sandbox.ebay.com/identity/v1';

// Exchange authorization code for access token
router.post('/token', async (req, res, next) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Create Basic Auth header (base64 encoded appID:certID)
    const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');

    const response = await axios.post(
      `${OAUTH_BASE_URL}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri || `${FRONTEND_URL}/ebay-callback.html`
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    // Get user info
    let username = null;
    try {
      const userResponse = await axios.get(
        'https://api.ebay.com/commerce/identity/v1/user',
        {
          headers: {
            'Authorization': `Bearer ${response.data.access_token}`
          }
        }
      );
      username = userResponse.data.username;
    } catch (userErr) {
      console.warn('Could not fetch user info:', userErr.message);
    }

    res.json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type,
      username: username
    });

  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    next({
      status: error.response?.status || 500,
      message: error.response?.data?.error_description || 'Failed to exchange authorization code'
    });
  }
});

// Refresh access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');

    const response = await axios.post(
      `${OAUTH_BASE_URL}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        scope: [
          'https://api.ebay.com/oauth/api_scope',
          'https://api.ebay.com/oauth/api_scope/sell.inventory',
          'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly'
        ].join(' ')
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    let username = null;
    try {
      const userResponse = await axios.get(
        'https://api.ebay.com/commerce/identity/v1/user',
        { headers: { 'Authorization': `Bearer ${response.data.access_token}` } }
      );
      username = userResponse.data.username;
    } catch (userErr) {
      console.warn('Could not fetch user info on refresh:', userErr.message);
    }

    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type,
      username,
    });

  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    next({
      status: error.response?.status || 500,
      message: error.response?.data?.error_description || 'Failed to refresh token'
    });
  }
});

module.exports = router;
