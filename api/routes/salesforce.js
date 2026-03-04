const express = require('express');
const router = express.Router();
const axios = require('axios');
const SalesforceClient = require('../clients/salesforce');
const { createLogger } = require('../utils/logger');

const logger = createLogger('salesforce-route');

const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;
const REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || 'https://lemlist-hubspot-integration.vercel.app/api/salesforce/callback';
const LOGIN_URL = 'https://login.salesforce.com';

/**
 * GET /api/salesforce/auth
 * Redirect to Salesforce OAuth authorization page
 */
router.get('/auth', (req, res) => {
  if (!SALESFORCE_CLIENT_ID) {
    return res.status(500).json({
      error: 'SALESFORCE_CLIENT_ID not configured',
      setup: 'Add SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, and SALESFORCE_REDIRECT_URI to your environment variables'
    });
  }

  const authUrl = new URL(`${LOGIN_URL}/services/oauth2/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', SALESFORCE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', 'full refresh_token');

  res.redirect(authUrl.toString());
});

/**
 * GET /api/salesforce/callback
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
    const response = await axios.post(
      `${LOGIN_URL}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SALESFORCE_CLIENT_ID,
        client_secret: SALESFORCE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, refresh_token, instance_url } = response.data;

    const sfClient = new SalesforceClient();
    await sfClient.storeTokens(access_token, refresh_token, instance_url);

    logger.info({ instanceUrl: instance_url }, 'Salesforce OAuth completed');

    res.redirect('/?salesforce=connected');

  } catch (error) {
    logger.error({ error: error.response?.data || error.message }, 'Salesforce OAuth callback error');
    res.status(500).json({
      error: 'Failed to complete Salesforce OAuth',
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/salesforce/status
 * Check current Salesforce connection status
 */
router.get('/status', async (req, res) => {
  try {
    const sfClient = new SalesforceClient();
    const results = await sfClient.query('SELECT Id FROM Opportunity LIMIT 1');

    res.json({
      connected: true,
      status: 'active',
      message: 'Salesforce connection is working'
    });

  } catch (error) {
    res.json({
      connected: false,
      status: 'disconnected',
      message: error.message,
      authUrl: '/api/salesforce/auth'
    });
  }
});

/**
 * GET /api/salesforce/discover-fields?object=Opportunity
 * Temporary endpoint to discover custom field API names.
 * Usage: /api/salesforce/discover-fields?object=Opportunity&search=gap
 */
router.get('/discover-fields', async (req, res) => {
  const { object = 'Opportunity', search } = req.query;

  try {
    const sfClient = new SalesforceClient();
    const soql = `SELECT QualifiedApiName, Label, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${sfClient.escapeSoqlLiteral(object)}'${search ? ` AND Label LIKE '%${sfClient.escapeSoqlLiteral(search)}%'` : ''} ORDER BY Label`;

    const results = await sfClient.query(soql);

    // Filter to custom fields by default (show all if search provided)
    const fields = results
      .filter(f => search || f.QualifiedApiName?.endsWith('__c'))
      .map(f => ({
        apiName: f.QualifiedApiName,
        label: f.Label,
        type: f.DataType,
      }));

    res.json({ object, fieldCount: fields.length, fields });
  } catch (error) {
    logger.error({ error: error.message }, 'Salesforce field discovery failed');
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
