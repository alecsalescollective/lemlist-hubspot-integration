const express = require('express');
const router = express.Router();
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
