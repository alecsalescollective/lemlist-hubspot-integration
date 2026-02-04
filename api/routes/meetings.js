const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

/**
 * GET /api/meetings
 * Get all meetings with optional filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { owner, date = 'all' } = req.query;
    const meetings = await dashboardService.getMeetings(owner, date);
    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/meetings/stats
 * Get meeting statistics by owner
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { owner, period = '30d' } = req.query;
    const stats = await dashboardService.getMeetingStats(owner, period);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
