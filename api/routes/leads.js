const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

/**
 * GET /api/leads/summary
 * Get lead summary with counts by owner, status, source
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { owner, period = '7d' } = req.query;
    const summary = await dashboardService.getLeadsSummary(owner, period);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leads
 * Get paginated leads list
 */
router.get('/', async (req, res, next) => {
  try {
    const { owner, limit = 50, offset = 0 } = req.query;
    const leads = await dashboardService.getLeads(
      owner,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );
    res.json(leads);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
