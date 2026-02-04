const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

/**
 * GET /api/campaigns
 * Get all campaigns with metrics
 */
router.get('/', async (req, res, next) => {
  try {
    const { owner } = req.query;
    const campaigns = await dashboardService.getCampaigns(owner);
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/campaigns/:id
 * Get single campaign by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const campaign = await dashboardService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: { message: 'Campaign not found' } });
    }
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
