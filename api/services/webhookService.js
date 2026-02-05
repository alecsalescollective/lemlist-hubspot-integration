const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');
const LemlistClient = require('../clients/lemlist');
const { config } = require('../config');

const logger = createLogger('webhook-service');

// Initialize clients lazily
let supabase, lemlist;

function getClients() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  if (!lemlist) {
    lemlist = new LemlistClient(config.lemlist);
  }
  return { supabase, lemlist };
}

/**
 * Webhook Service
 * Handles incoming webhooks and triggers downstream actions
 */
class WebhookService {
  /**
   * Handle lemcal meeting booked webhook
   * Marks the lead as interested in lemlist, triggering Salesforce opportunity creation
   *
   * @param {Object} payload - Webhook payload from lemcal
   * @returns {Promise<Object>} - Result of the operation
   */
  async handleLemcalMeetingBooked(payload) {
    const { supabase, lemlist } = getClients();

    // Extract email from various possible payload structures
    const email = this.extractEmailFromPayload(payload);

    if (!email) {
      logger.warn({ payload }, 'No email found in lemcal webhook payload');
      throw new Error('No email found in webhook payload');
    }

    logger.info({ email }, 'Processing meeting booked webhook');

    // Mark lead as interested in lemlist
    const result = await this.markLeadInterested(email);

    // Log the event to Supabase for tracking
    await this.logWebhookEvent('lemcal_meeting_booked', email, payload, result);

    return result;
  }

  /**
   * Mark a lead as interested in lemlist
   * This triggers lemlist's native Salesforce integration
   *
   * @param {string} email - Lead email address
   * @returns {Promise<Object>} - Result
   */
  async markLeadInterested(email) {
    const { lemlist } = getClients();

    try {
      // First, check if the lead exists in lemlist
      const lead = await lemlist.getLeadByEmail(email);

      if (!lead) {
        logger.warn({ email }, 'Lead not found in lemlist');
        throw new Error(`Lead not found in lemlist: ${email}`);
      }

      logger.info({
        email,
        leadId: lead._id,
        campaignId: lead.campaignId
      }, 'Found lead in lemlist, marking as interested');

      // Mark the lead as interested
      const result = await lemlist.markLeadAsInterested(email);

      logger.info({ email, result }, 'Successfully marked lead as interested');

      return {
        success: true,
        email,
        leadId: lead._id,
        status: 'interested',
        message: 'Lead marked as interested - Salesforce sync will create opportunity'
      };

    } catch (error) {
      logger.error({ email, error: error.message }, 'Failed to mark lead as interested');

      // If it's a 404, the lead doesn't exist
      if (error.response?.status === 404) {
        throw new Error(`Lead not found in lemlist: ${email}`);
      }

      throw error;
    }
  }

  /**
   * Extract email from various webhook payload structures
   * Lemcal may send different formats
   *
   * @param {Object} payload - Webhook payload
   * @returns {string|null} - Email or null
   */
  extractEmailFromPayload(payload) {
    // Try common payload structures
    const possiblePaths = [
      payload.email,
      payload.invitee?.email,
      payload.attendee?.email,
      payload.guest?.email,
      payload.contact?.email,
      payload.data?.email,
      payload.data?.invitee?.email,
      payload.booking?.email,
      payload.booking?.invitee?.email
    ];

    for (const email of possiblePaths) {
      if (email && typeof email === 'string' && email.includes('@')) {
        return email.toLowerCase().trim();
      }
    }

    return null;
  }

  /**
   * Handle Lemlist activity webhook
   * Stores email opens, replies, clicks to lead_activities table
   *
   * @param {Object} payload - Webhook payload from Lemlist
   * @returns {Promise<Object>} - Result of the operation
   */
  async handleLemlistActivity(payload) {
    const { supabase } = getClients();

    // Map Lemlist webhook types to our activity types
    const activityTypeMap = {
      'emailsOpened': 'email_opened',
      'emailsSent': 'email_sent',
      'emailsReplied': 'email_replied',
      'emailsClicked': 'email_clicked',
      'emailsBounced': 'email_bounced',
      'opened': 'email_opened',
      'sent': 'email_sent',
      'replied': 'email_replied',
      'clicked': 'email_clicked',
      'bounced': 'email_bounced'
    };

    const email = payload.email || payload.leadEmail;
    const eventType = payload.type || payload.event || payload.eventType;
    const activityType = activityTypeMap[eventType] || eventType;

    if (!email) {
      logger.warn({ payload }, 'No email in Lemlist activity payload');
      throw new Error('No email found in webhook payload');
    }

    if (!activityType) {
      logger.warn({ payload }, 'No activity type in Lemlist payload');
      throw new Error('No activity type found in webhook payload');
    }

    logger.info({ email, activityType }, 'Processing Lemlist activity webhook');

    // Extract campaign info and owner
    const campaignId = payload.campaignId || payload.campaign?._id;
    const campaignName = payload.campaignName || payload.campaign?.name;

    // Derive owner from campaign name (e.g., "Alec - Q4 Outreach" -> "alec")
    let owner = null;
    if (campaignName) {
      const ownerMatch = campaignName.match(/^(alec|janae|kate)/i);
      if (ownerMatch) {
        owner = ownerMatch[1].toLowerCase();
      }
    }

    // Insert into lead_activities
    const { error } = await supabase
      .from('lead_activities')
      .insert({
        lead_email: email.toLowerCase().trim(),
        contact_name: payload.firstName
          ? `${payload.firstName} ${payload.lastName || ''}`.trim()
          : null,
        activity_type: activityType,
        campaign_id: campaignId,
        campaign_name: campaignName,
        owner,
        activity_at: payload.timestamp || payload.date || new Date().toISOString(),
        metadata: payload
      });

    if (error) {
      logger.error({ error: error.message, email }, 'Failed to insert lead activity');
      throw error;
    }

    logger.info({ email, activityType, campaignId }, 'Lead activity recorded');

    return {
      success: true,
      email,
      activityType,
      campaignId
    };
  }

  /**
   * Log webhook event to Supabase for audit trail
   *
   * @param {string} eventType - Type of event
   * @param {string} email - Associated email
   * @param {Object} payload - Original payload
   * @param {Object} result - Processing result
   */
  async logWebhookEvent(eventType, email, payload, result) {
    const { supabase } = getClients();

    try {
      await supabase
        .from('webhook_events')
        .insert({
          event_type: eventType,
          email,
          payload: JSON.stringify(payload),
          result: JSON.stringify(result),
          processed_at: new Date().toISOString()
        });
    } catch (error) {
      // Don't fail the webhook if logging fails
      logger.warn({ error: error.message }, 'Failed to log webhook event');
    }
  }
}

module.exports = new WebhookService();
