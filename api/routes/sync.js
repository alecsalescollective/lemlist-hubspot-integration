const express = require('express');
const router = express.Router();
const axios = require('axios');
const dashboardService = require('../services/dashboardService');
const syncService = require('../services/syncService');

/**
 * GET /api/sync/status
 * Get sync status for all data types
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await dashboardService.getSyncStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/debug
 * Debug endpoint to check API connectivity
 */
router.get('/debug', async (req, res) => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const debugInfo = {
    hubspot: {
      tokenPresent: !!token,
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.substring(0, 10) + '...' : null,
      tokenHasWhitespace: token ? (token !== token.trim()) : null
    },
    lemlist: {
      keyPresent: !!process.env.LEMLIST_API_KEY,
      keyLength: process.env.LEMLIST_API_KEY ? process.env.LEMLIST_API_KEY.length : 0
    },
    supabase: {
      urlPresent: !!process.env.SUPABASE_URL,
      keyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  };

  // Test HubSpot connectivity
  if (token) {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        }
      });
      debugInfo.hubspot.testResult = 'SUCCESS';
      debugInfo.hubspot.testStatus = response.status;
    } catch (error) {
      debugInfo.hubspot.testResult = 'FAILED';
      debugInfo.hubspot.testStatus = error.response?.status;
      debugInfo.hubspot.testError = error.response?.data?.message || error.message;
    }
  }

  res.json(debugInfo);
});

/**
 * GET /api/sync/debug-contacts
 * Debug: List recent contacts with their add_to_lemlist values
 */
router.get('/debug-contacts', async (req, res) => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  try {
    // Get recent contacts with the trigger field
    const response = await axios.get(
      'https://api.hubapi.com/crm/v3/objects/contacts?limit=20&properties=email,firstname,lastname,add_to_lemlist,hubspot_owner_id',
      {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      total: response.data.total,
      contacts: response.data.results?.map(c => ({
        id: c.id,
        email: c.properties.email,
        name: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim(),
        add_to_lemlist: c.properties.add_to_lemlist,
        ownerId: c.properties.hubspot_owner_id
      }))
    });
  } catch (error) {
    res.json({
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/sync/debug-search
 * Debug: Test HubSpot search for triggered contacts
 */
router.get('/debug-search', async (req, res) => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const routingConfig = require('../config/routing.json');

  const triggerField = routingConfig.trigger_field;
  const triggerValue = routingConfig.trigger_value;

  try {
    // Search for contacts with trigger field set
    const searchResponse = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        filterGroups: [{
          filters: [{
            propertyName: triggerField,
            operator: 'EQ',
            value: triggerValue
          }]
        }],
        properties: ['email', 'firstname', 'lastname', triggerField, 'hubspot_owner_id'],
        limit: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      config: { triggerField, triggerValue },
      searchResults: searchResponse.data.total,
      contacts: searchResponse.data.results?.map(c => ({
        id: c.id,
        email: c.properties.email,
        name: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim(),
        triggerFieldValue: c.properties[triggerField],
        ownerId: c.properties.hubspot_owner_id
      }))
    });
  } catch (error) {
    res.json({
      config: { triggerField, triggerValue },
      error: error.response?.data || error.message
    });
  }
});

/**
 * POST /api/sync/trigger
 * Manually trigger a sync for all data types
 */
router.post('/trigger', async (req, res, next) => {
  try {
    const { type = 'all' } = req.body;

    // Start sync in background
    const result = await syncService.triggerSync(type);

    res.json({
      message: 'Sync triggered successfully',
      type,
      result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
