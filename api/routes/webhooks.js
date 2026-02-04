const express = require('express');
const router = express.Router();
const { createLogger } = require('../utils/logger');
const webhookService = require('../services/webhookService');

const logger = createLogger('webhooks-route');

/**
 * POST /api/webhooks/lemcal
 * Handle lemcal meeting booked webhook
 *
 * When a meeting is booked via lemcal:
 * 1. Verify webhook signature (if LEMCAL_WEBHOOK_SECRET is set)
 * 2. Extract lead email from webhook payload
 * 3. Mark lead as "interested" in lemlist
 * 4. Lemlist's native Salesforce integration creates the opportunity
 */
router.post('/lemcal', async (req, res) => {
  try {
    const payload = req.body;

    logger.info({
      event: payload.event || payload.type,
      email: payload.email || payload.invitee?.email
    }, 'Received lemcal webhook');

    if (!payload) {
      return res.status(400).json({ error: 'Empty payload' });
    }

    // Process the webhook
    const result = await webhookService.handleLemcalMeetingBooked(payload);

    res.json({
      success: true,
      message: 'Webhook processed',
      result
    });

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Lemcal webhook error');

    // Return 200 to prevent retries for known errors
    if (error.message.includes('Lead not found')) {
      return res.json({
        success: false,
        message: error.message,
        skipped: true
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/webhooks/lemcal/test
 * Test endpoint to manually trigger the interested flow
 */
router.post('/lemcal/test', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    logger.info({ email }, 'Test: marking lead as interested');

    const result = await webhookService.markLeadInterested(email);

    res.json({
      success: true,
      message: 'Lead marked as interested',
      result
    });

  } catch (error) {
    logger.error({ error: error.message }, 'Test webhook error');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/webhooks/health
 * Health check for webhook endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'webhooks',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
