const express = require('express');
const router = express.Router();
const axios = require('axios');
const HubSpotClient = require('../clients/hubspot');
const { config } = require('../config');

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || 'https://lemlist-hubspot-integration.vercel.app/api/hubspot/callback';

// Required scopes for the integration
const SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write'
];

/**
 * GET /api/hubspot/auth
 * Redirect to HubSpot OAuth authorization page
 */
router.get('/auth', (req, res) => {
  if (!HUBSPOT_CLIENT_ID) {
    return res.status(500).json({
      error: 'HUBSPOT_CLIENT_ID not configured',
      setup: 'Add HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET to your environment variables'
    });
  }

  const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
  authUrl.searchParams.set('client_id', HUBSPOT_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES.join(' '));

  res.redirect(authUrl.toString());
});

/**
 * GET /api/hubspot/callback
 * OAuth callback - exchange code for tokens
 */
router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).json({
      error,
      description: error_description
    });
  }

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    // Exchange code for tokens
    const response = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Store tokens in database
    const hubspot = new HubSpotClient(config.hubspot);
    await hubspot.storeTokens(access_token, refresh_token, expires_in);

    // Redirect to dashboard with success message
    res.redirect('/?hubspot=connected');

  } catch (error) {
    console.error('[HubSpot OAuth] Callback error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to complete OAuth',
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/hubspot/status
 * Check current HubSpot connection status
 */
router.get('/status', async (req, res) => {
  try {
    const hubspot = new HubSpotClient(config.hubspot);
    const token = await hubspot.getValidToken();

    // Test the token
    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      connected: true,
      status: 'active',
      message: 'HubSpot connection is working'
    });

  } catch (error) {
    res.json({
      connected: false,
      status: 'disconnected',
      message: error.message,
      authUrl: '/api/hubspot/auth'
    });
  }
});

module.exports = router;
