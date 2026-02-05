const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

/**
 * GET /api/funnel/stats
 * Get funnel statistics: Leads -> In Sequence -> Meetings Booked
 *
 * Query params:
 * - owner: Filter by owner (optional)
 * - period: Date range - '7d', '30d', 'month' (default: '30d')
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { owner, period = '30d' } = req.query;
    const stats = await dashboardService.getFunnelStats(owner, period);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
