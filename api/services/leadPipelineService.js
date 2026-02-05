const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');
const HubSpotClient = require('../clients/hubspot');
const LemlistClient = require('../clients/lemlist');
const { config } = require('../config');
const routingConfig = require('../config/routing.json');

const logger = createLogger('lead-pipeline');

// Lazy initialization
let supabase, hubspot, lemlist;

function getClients() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  if (!hubspot) {
    hubspot = new HubSpotClient(config.hubspot);
  }
  if (!lemlist) {
    lemlist = new LemlistClient(config.lemlist);
  }
  return { supabase, hubspot, lemlist };
}

/**
 * Lead Pipeline Service
 * Searches HubSpot for contacts with trigger field set, adds them to Lemlist campaigns
 */
class LeadPipelineService {
  /**
   * Run the lead pipeline - triggered by Vercel Cron
   * @returns {Promise<Object>} Pipeline run results
   */
  async run() {
    const { supabase, hubspot, lemlist } = getClients();

    const results = {
      startedAt: new Date().toISOString(),
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duplicates: 0,
      errors: []
    };

    try {
      logger.info('Starting lead pipeline run');

      // Search for contacts where add_to_lemlist = true
      const contacts = await this.searchTriggeredContacts();

      logger.info({ count: contacts.length }, 'Found triggered contacts');

      if (contacts.length === 0) {
        results.completedAt = new Date().toISOString();
        return results;
      }

      // Process each contact
      for (const contact of contacts) {
        results.processed++;

        try {
          const result = await this.processContact(contact);

          if (result.skipped) {
            results.skipped++;
          } else if (result.duplicate) {
            results.duplicates++;
            results.succeeded++;
          } else {
            results.succeeded++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            contactId: contact.id,
            error: error.message
          });
          logger.error({ contactId: contact.id, error: error.message }, 'Failed to process contact');
        }
      }

      results.completedAt = new Date().toISOString();
      results.durationMs = new Date(results.completedAt) - new Date(results.startedAt);

      logger.info({
        processed: results.processed,
        succeeded: results.succeeded,
        failed: results.failed,
        skipped: results.skipped,
        duplicates: results.duplicates,
        durationMs: results.durationMs
      }, 'Lead pipeline run complete');

      // Update sync status
      await this.updateSyncStatus('leads', results.failed === 0 ? 'success' : 'partial', results.succeeded);

    } catch (error) {
      results.error = error.message;
      logger.error({ error: error.message }, 'Lead pipeline error');
      await this.updateSyncStatus('leads', 'failed', 0, error.message);
    }

    return results;
  }

  /**
   * Search HubSpot for contacts with trigger field set
   */
  async searchTriggeredContacts() {
    const { hubspot } = getClients();

    const triggerField = routingConfig.trigger_field;
    const triggerValue = routingConfig.trigger_value;
    const aiContextProps = routingConfig.ai_context_fields
      ? Object.values(routingConfig.ai_context_fields)
      : [];

    const properties = [
      'email',
      'firstname',
      'lastname',
      'company',
      'hubspot_owner_id',
      'lead_source',
      'lifecyclestage',
      'hs_email_optout',
      triggerField,
      ...aiContextProps
    ];

    try {
      const response = await hubspot.client.post('/crm/v3/objects/contacts/search', {
        filterGroups: [{
          filters: [{
            propertyName: triggerField,
            operator: 'EQ',
            value: triggerValue
          }]
        }],
        properties,
        limit: 100
      });

      return response.data?.results || [];
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to search HubSpot contacts');
      throw error;
    }
  }

  /**
   * Process a single contact
   */
  async processContact(contact) {
    const { supabase, lemlist } = getClients();

    const contactId = contact.id;
    const props = contact.properties || {};
    const email = props.email;

    if (!email) {
      logger.warn({ contactId }, 'Contact missing email, skipping');
      return { skipped: true };
    }

    // Check exclusion rules
    if (this.shouldExclude(props)) {
      logger.info({ contactId, email }, 'Contact excluded by rule');
      return { skipped: true };
    }

    // Get owner and campaign
    const ownerId = props.hubspot_owner_id;
    const ownerName = routingConfig.owners[ownerId];

    if (!ownerName) {
      logger.warn({ contactId, ownerId }, 'Unknown owner ID, skipping');
      return { skipped: true };
    }

    const campaignId = routingConfig.campaigns[ownerName];

    if (!campaignId || campaignId === 'PLACEHOLDER') {
      logger.warn({ contactId, ownerName }, 'No campaign configured for owner, skipping');
      return { skipped: true };
    }

    // Check if already processed in Supabase
    const { data: existing } = await supabase
      .from('processed_leads')
      .select('id')
      .or(`hubspot_contact_id.eq.${contactId},email.eq.${email}`)
      .limit(1);

    if (existing && existing.length > 0) {
      logger.debug({ contactId, email }, 'Contact already processed, skipping');
      return { skipped: true };
    }

    // Check if lead exists in Lemlist
    const existingLead = await this.checkLeadExistsInLemlist(campaignId, email);

    if (existingLead) {
      logger.info({ contactId, email }, 'Lead already exists in Lemlist, marking as processed');
      await this.markProcessed(contactId, email, ownerName, campaignId, props.lead_source);
      return { duplicate: true };
    }

    // Build lead payload
    let leadPayload = {
      email,
      firstName: props.firstname || '',
      lastName: props.lastname || '',
      companyName: props.company || ''
    };

    // Enrich the lead before adding to campaign
    logger.info({ contactId, email }, 'Enriching lead data');
    try {
      leadPayload = await lemlist.enrichLead(leadPayload, {
        maxWaitMs: 30000,
        pollIntervalMs: 2000
      });

      if (leadPayload.enriched) {
        logger.info({ contactId, email, enriched: true }, 'Lead enrichment completed');
      }
    } catch (enrichError) {
      // Log but don't fail - continue with original data
      logger.warn({ contactId, email, error: enrichError.message }, 'Lead enrichment failed, continuing with original data');
    }

    // Add AI context fields
    for (const [lemlistVar, hubspotProp] of Object.entries(routingConfig.ai_context_fields || {})) {
      if (props[hubspotProp]) {
        leadPayload[lemlistVar] = String(props[hubspotProp]);
      }
    }

    // Add owner name for AI personalization
    const ownerNameMap = {
      'alec': 'Alec McCullough',
      'janae': 'Janae Gilliam',
      'kate': 'Kate Norton'
    };
    leadPayload.Owner = ownerNameMap[ownerName] || ownerName;

    // Add lead to Lemlist campaign
    await lemlist.addLeadToCampaign(campaignId, leadPayload);

    // Mark as processed in Supabase (this prevents re-processing since we can't clear HubSpot trigger)
    await this.markProcessed(contactId, email, ownerName, campaignId, props.lead_source);

    logger.info({ contactId, email, campaignId }, 'Lead added to Lemlist campaign');

    return { success: true };
  }

  /**
   * Check if contact should be excluded
   */
  shouldExclude(props) {
    const rules = routingConfig.exclusion_rules || {};

    // Check lifecycle stage
    if (rules.exclude_lifecycle_stages?.length > 0) {
      const lifecycle = props.lifecyclestage?.toLowerCase();
      if (lifecycle && rules.exclude_lifecycle_stages.includes(lifecycle)) {
        return true;
      }
    }

    // Check email opt-out
    if (rules.exclude_if_email_optout) {
      if (props.hs_email_optout === 'true' || props.hs_email_optout === true) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if lead exists in Lemlist campaign
   * Note: Lemlist API returns 200 with empty string "" when lead doesn't exist
   * So we need to check the response data, not just the status code
   */
  async checkLeadExistsInLemlist(campaignId, email) {
    const { lemlist } = getClients();

    try {
      const response = await lemlist.client.get(`/campaigns/${campaignId}/leads/${encodeURIComponent(email)}`);
      // Lemlist returns empty string "" or null when lead doesn't exist (but still 200 status)
      // Only return true if we get actual lead data back
      const data = response.data;
      if (!data || data === '' || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return false;
      }
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Mark contact as processed in Supabase
   */
  async markProcessed(contactId, email, owner, campaignId, leadSource) {
    const { supabase } = getClients();

    await supabase.from('processed_leads').upsert({
      hubspot_contact_id: contactId,
      email,
      owner,
      campaign_id: campaignId,
      lead_source: leadSource || 'trigger',
      processed_at: new Date().toISOString()
    }, { onConflict: 'hubspot_contact_id' });
  }

  /**
   * Update sync status in Supabase
   */
  async updateSyncStatus(syncType, status, recordsSynced = 0, errorMessage = null) {
    const { supabase } = getClients();

    await supabase.from('sync_status').upsert({
      sync_type: syncType,
      last_sync_at: new Date().toISOString(),
      status,
      records_synced: recordsSynced,
      error_message: errorMessage
    }, { onConflict: 'sync_type' });
  }
}

module.exports = new LeadPipelineService();
