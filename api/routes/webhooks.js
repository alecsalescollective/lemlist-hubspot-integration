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
 * POST /api/webhooks/lemlist/activity
 * Handle Lemlist activity webhooks (opens, clicks, replies, bounces)
 *
 * Configure in Lemlist:
 * 1. Go to Settings -> Integrations -> Webhooks
 * 2. Add new webhook for events: emailsOpened, emailsClicked, emailsReplied, emailsBounced
 * 3. Set URL to: https://your-api.vercel.app/api/webhooks/lemlist/activity
 */
router.post('/lemlist/activity', async (req, res) => {
  try {
    const payload = req.body;

    logger.info({
      event: payload.type || payload.event,
      email: payload.email || payload.leadEmail
    }, 'Received Lemlist activity webhook');

    if (!payload) {
      return res.status(400).json({ error: 'Empty payload' });
    }

    const result = await webhookService.handleLemlistActivity(payload);

    res.json({
      success: true,
      message: 'Activity recorded',
      result
    });

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Lemlist activity webhook error');

    // Return 200 to prevent retries for known errors
    if (error.message.includes('No email') || error.message.includes('No activity')) {
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
 * POST /api/webhooks/lemlist/sequence-done
 * Handle Lemlist sequence done webhooks (all emails sent to a lead)
 *
 * Configure in Lemlist:
 * 1. Go to Settings -> Integrations -> Webhooks
 * 2. Add new webhook for event: emailsSendingDone
 * 3. Set URL to: https://your-api.vercel.app/api/webhooks/lemlist/sequence-done
 */
router.post('/lemlist/sequence-done', async (req, res) => {
  try {
    const payload = req.body;

    logger.info({
      event: payload.type || payload.event,
      email: payload.email || payload.leadEmail
    }, 'Received Lemlist sequence done webhook');

    if (!payload) {
      return res.status(400).json({ error: 'Empty payload' });
    }

    const result = await webhookService.handleLemlistSequenceDone(payload);

    res.json({
      success: true,
      message: 'Sequence done recorded',
      result
    });

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Lemlist sequence done webhook error');
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
