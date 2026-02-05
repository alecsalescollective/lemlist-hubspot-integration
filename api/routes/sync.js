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
