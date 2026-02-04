const express = require('express');
const router = express.Router();
const { createLogger } = require('../utils/logger');
const leadPipelineService = require('../services/leadPipelineService');

const logger = createLogger('cron-route');

/**
 * Verify Vercel Cron authorization
 * Vercel sends CRON_SECRET in the Authorization header
 */
function verifyCronAuth(req) {
  // In development, skip auth
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Vercel Cron sends authorization header
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET configured, allow (but warn)
  if (!cronSecret) {
    logger.warn('CRON_SECRET not configured - cron endpoint is unprotected');
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * POST /api/cron/sync-leads
 * Triggered by Vercel Cron to sync leads from HubSpot to Lemlist
 */
router.post('/sync-leads', async (req, res) => {
  // Verify authorization
  if (!verifyCronAuth(req)) {
    logger.warn('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info('Cron triggered: sync-leads');

    const results = await leadPipelineService.run();

    logger.info({
      processed: results.processed,
      succeeded: results.succeeded,
      failed: results.failed
    }, 'Cron sync-leads completed');

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Cron sync-leads failed');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cron/sync-leads
 * Also support GET for easier testing
 */
router.get('/sync-leads', async (req, res) => {
  // Verify authorization
  if (!verifyCronAuth(req)) {
    logger.warn('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info('Cron triggered (GET): sync-leads');

    const results = await leadPipelineService.run();

    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Cron sync-leads failed');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
