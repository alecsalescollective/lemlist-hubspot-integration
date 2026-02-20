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
  constructor() {
    this.sourceContextCache = new Map();
  }

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

    const properties = Array.from(new Set([
      'email',
      'firstname',
      'lastname',
      'company',
      'hubspot_owner_id',
      'lead_source',
      'hs_object_source_detail_1',
      'lifecyclestage',
      'hs_email_optout',
      'source__sfdc_contact_record',
      triggerField,
      ...aiContextProps
    ]));

    try {
      // Search for both "true" and "Yes" values (HubSpot checkbox can return either)
      const triggerValues = Array.isArray(triggerValue) ? triggerValue : [triggerValue];
      const filterGroups = triggerValues.map(val => ({
        filters: [{
          propertyName: triggerField,
          operator: 'EQ',
          value: val
        }]
      }));

      const response = await hubspot.client.post('/crm/v3/objects/contacts/search', {
        filterGroups,
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
    const sourceDetail = props.hs_object_source_detail_1
      ? String(props.hs_object_source_detail_1).trim()
      : '';

    if (!email) {
      logger.warn({ contactId }, 'Contact missing email, skipping');
      return { skipped: true };
    }

    // Check exclusion rules
    if (this.shouldExclude(props)) {
      logger.info({ contactId, email }, 'Contact excluded by rule');
      return { skipped: true };
    }

    // Resolve owner and campaign.
    // Priority: contact owner -> associated account owner.
    const contactOwnerId = props.hubspot_owner_id
      ? String(props.hubspot_owner_id).trim()
      : null;
    let ownerName = contactOwnerId ? routingConfig.owners[contactOwnerId] : null;
    let ownerResolution = contactOwnerId ? 'contact_owner' : 'none';
    let associatedCompany = null;

    if (!ownerName) {
      associatedCompany = await this.getAssociatedCompanyData(contactId);
      const accountOwnerId = associatedCompany?.ownerId
        ? String(associatedCompany.ownerId).trim()
        : null;
      if (accountOwnerId && routingConfig.owners[accountOwnerId]) {
        ownerName = routingConfig.owners[accountOwnerId];
        ownerResolution = 'account_owner';
      } else {
        logger.warn({
          contactId,
          email,
          contactOwnerId,
          accountOwnerId,
          associatedCompanyId: associatedCompany?.id || null
        }, 'Unable to resolve owner from contact or account owner, skipping');
        return { skipped: true };
      }
    }

    if (!ownerName) {
      logger.warn({ contactId, email, contactOwnerId }, 'Unknown owner ID, skipping');
      return { skipped: true };
    }

    const campaignId = this.getCampaignIdForOwner(ownerName);

    if (!campaignId || campaignId === 'PLACEHOLDER') {
      logger.warn({ contactId, ownerName }, 'No campaign configured for owner, skipping');
      return { skipped: true };
    }

    const sourceContextSummary = await this.getSourceContextSummary(sourceDetail);

    // Check if already processed in Supabase
    const { data: existing } = await supabase
      .from('processed_leads')
      .select('id')
      .or(`contact_id.eq.${contactId},email.eq.${email}`)
      .limit(1);

    if (existing && existing.length > 0) {
      logger.debug({ contactId, email }, 'Contact already processed, skipping');
      return { skipped: true };
    }

    // Check if lead exists in Lemlist
    const existingLead = await this.checkLeadExistsInLemlist(campaignId, email);

    if (existingLead) {
      logger.info({ contactId, email }, 'Lead already exists in Lemlist, marking as processed');
      await this.markProcessed(
        contactId,
        email,
        ownerName,
        campaignId,
        props.lead_source,
        sourceDetail,
        sourceContextSummary
      );
      return { duplicate: true };
    }

    // Build lead payload
    let leadPayload = {
      email,
      firstName: props.firstname || '',
      lastName: props.lastname || '',
      companyName: props.company || ''
    };

    // If HubSpot contact is missing company, try to fetch from associated company
    if (!leadPayload.companyName) {
      if (!associatedCompany) {
        associatedCompany = await this.getAssociatedCompanyData(contactId);
      }
      if (associatedCompany?.name) {
        leadPayload.companyName = associatedCompany.name;
        logger.info({ contactId, email, companyName: associatedCompany.name }, 'Got company from HubSpot association');
      }
    }

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

    // If companyName is still empty after enrichment, derive from email domain
    if (!leadPayload.companyName) {
      leadPayload.companyName = this.deriveCompanyFromEmail(email);
      logger.warn({ contactId, email, companyName: leadPayload.companyName }, 'Company missing after enrichment, using email domain fallback');
    }

    // Add Salesforce source field (maps to Source__c in SF via Lemlist field mapping)
    // Priority: source__sfdc_contact_record → normalized source_detail → "Other"
    leadPayload.sfdcSource = props.source__sfdc_contact_record
      ? String(props.source__sfdc_contact_record)
      : this.normalizeSourceDetail(sourceDetail);

    // Add AI context fields - always send all fields, use empty string if no data
    for (const [lemlistVar, hubspotProp] of Object.entries(routingConfig.ai_context_fields || {})) {
      if (hubspotProp === 'hs_object_source_detail_1') {
        leadPayload[lemlistVar] = sourceContextSummary || sourceDetail || '';
      } else {
        leadPayload[lemlistVar] = props[hubspotProp] ? String(props[hubspotProp]) : '';
      }
    }

    // Backward compatibility safety: keep leadSource populated even if routing config changes.
    if (!Object.prototype.hasOwnProperty.call(leadPayload, 'leadSource') && (sourceContextSummary || sourceDetail)) {
      leadPayload.leadSource = sourceContextSummary || sourceDetail;
    }

    // Add owner name for AI personalization
    const ownerNameMap = {
      'alec': 'Alec McCullough',
      'janae': 'Janae Gilliam',
      'kate': 'Kate Norton'
    };
    leadPayload.Owner = ownerNameMap[ownerName] || ownerName;

    // Fetch seller's Lemcal calendar link from Supabase
    const calendarLink = await this.getCalendarLink(ownerName);
    if (calendarLink) {
      leadPayload.lemcal_calendar_link = calendarLink;
    } else {
      logger.warn({ ownerName }, 'No calendar link found for owner');
    }

    // Add lead to Lemlist campaign
    await lemlist.addLeadToCampaign(campaignId, leadPayload);

    // Mark as processed in Supabase (this prevents re-processing since we can't clear HubSpot trigger)
    await this.markProcessed(
      contactId,
      email,
      ownerName,
      campaignId,
      props.lead_source,
      sourceDetail,
      sourceContextSummary
    );

    logger.info({ contactId, email, campaignId, ownerResolution }, 'Lead added to Lemlist campaign');

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
  async markProcessed(contactId, email, owner, campaignId, leadSource, sourceDetail, sourceContextSummary = null) {
    const { supabase } = getClients();

    const payload = {
      contact_id: contactId,
      email,
      owner,
      campaign_id: campaignId,
      lead_source: leadSource || 'trigger',
      source_detail: sourceDetail || null,
      source_context_summary: sourceContextSummary || null,
      processed_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('processed_leads')
      .upsert(payload, { onConflict: 'contact_id' });

    if (!error) {
      return;
    }

    // Backward-compatible fallback for environments where the new migration
    // has not been applied yet.
    if (error.message && error.message.includes('source_context_summary')) {
      logger.warn({ error: error.message }, 'processed_leads.source_context_summary column missing; retrying without context snapshot');
      const legacyPayload = { ...payload };
      delete legacyPayload.source_context_summary;

      const { error: legacyError } = await supabase
        .from('processed_leads')
        .upsert(legacyPayload, { onConflict: 'contact_id' });

      if (legacyError) {
        throw legacyError;
      }
      return;
    }

    throw error;
  }

  /**
   * Resolve campaign ID for owner.
   * Supports per-owner env overrides without changing routing.json.
   */
  getCampaignIdForOwner(ownerName) {
    const envKey = `LEMLIST_CAMPAIGN_${String(ownerName).toUpperCase()}`;
    const envCampaignId = process.env[envKey];
    if (envCampaignId && envCampaignId.trim()) {
      return envCampaignId.trim();
    }
    return routingConfig.campaigns[ownerName];
  }

  /**
   * Get rich context summary for a HubSpot source detail value.
   * If mapping does not exist yet, create scaffold 1:1 mapping and use raw value.
   */
  async getSourceContextSummary(sourceDetail) {
    const sourceValue = sourceDetail ? String(sourceDetail).trim() : '';
    if (!sourceValue) return '';

    const cached = this.sourceContextCache.get(sourceValue);
    if (cached) return cached;

    const { supabase } = getClients();
    try {
      const { data, error } = await supabase
        .from('lead_source_contexts')
        .select('context_summary, is_active')
        .eq('source_value', sourceValue)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const row = data[0];
        if (row.is_active === false) {
          this.sourceContextCache.set(sourceValue, sourceValue);
          return sourceValue;
        }

        const summary = row.context_summary
          ? String(row.context_summary).trim()
          : sourceValue;
        this.sourceContextCache.set(sourceValue, summary);
        return summary;
      }

      const summary = sourceValue;
      const { error: upsertError } = await supabase
        .from('lead_source_contexts')
        .upsert({
          source_value: sourceValue,
          context_summary: summary,
          is_active: true
        }, { onConflict: 'source_value' });

      if (upsertError) {
        logger.warn({ sourceValue, error: upsertError.message }, 'Failed to scaffold source context mapping');
      }

      this.sourceContextCache.set(sourceValue, summary);
      return summary;
    } catch (error) {
      logger.warn({ sourceValue, error: error.message }, 'Failed to resolve source context summary; falling back to raw source');
      return sourceValue;
    }
  }

  /**
   * Fetch associated company data from HubSpot for a contact.
   */
  async getAssociatedCompanyData(contactId) {
    const { hubspot } = getClients();

    try {
      // Use HubSpot associations API to find associated company
      const assocResponse = await hubspot.client.get(
        `/crm/v3/objects/contacts/${contactId}/associations/companies`
      );
      const companyIds = (assocResponse.data?.results || []).map(r => r.id);
      if (companyIds.length === 0) {
        return null;
      }

      // Fetch the first associated company's name + owner
      const companyResponse = await hubspot.client.get(
        `/crm/v3/objects/companies/${companyIds[0]}`,
        { params: { properties: 'name,hubspot_owner_id' } }
      );
      const properties = companyResponse.data?.properties || {};

      return {
        id: companyIds[0],
        name: properties.name || null,
        ownerId: properties.hubspot_owner_id ? String(properties.hubspot_owner_id).trim() : null
      };
    } catch (error) {
      logger.debug({ contactId, error: error.message }, 'Could not fetch associated company');
      return null;
    }
  }

  /**
   * Derive a company name from email domain as last resort
   * Salesforce requires Company field — this ensures it's never empty
   */
  deriveCompanyFromEmail(email) {
    const PERSONAL_DOMAINS = new Set([
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
      'protonmail.com', 'proton.me', 'mail.com', 'zoho.com', 'ymail.com'
    ]);

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return 'Unknown';

    if (PERSONAL_DOMAINS.has(domain)) {
      // For personal emails, use "Independent" — clearly signals no company
      return 'Independent';
    }

    // For business domains, capitalize the domain name (strip TLD)
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Normalize HubSpot source_detail into standardized categories for Salesforce
   * Patterns: "LM - ..." → Lead Magnet, "CU - ..." → Contact Us, etc.
   */
  normalizeSourceDetail(sourceDetail) {
    if (!sourceDetail) return 'Other';

    const val = sourceDetail.trim();
    if (val.startsWith('LM -') || val.toLowerCase().includes('lead magnet')) return 'Lead Magnet';
    if (val.startsWith('CU -') || val.toLowerCase().includes('contact us')) return 'Contact Us';
    if (val.toLowerCase().includes('referral') || val.toLowerCase().includes('partner')) return 'Referral';
    if (val.toLowerCase().includes('seo') || val.toLowerCase().includes('organic')) return 'Referral';

    return 'Other';
  }

  /**
   * Get the Lemcal calendar link for an owner
   */
  async getCalendarLink(ownerName) {
    const { supabase } = getClients();

    const { data, error } = await supabase
      .from('seller_calendar_links')
      .select('calendar_link')
      .eq('owner', ownerName)
      .single();

    if (error || !data) {
      logger.debug({ ownerName, error: error?.message }, 'Could not fetch calendar link');
      return null;
    }

    // Don't return placeholder values
    if (data.calendar_link.startsWith('PLACEHOLDER')) {
      logger.debug({ ownerName }, 'Calendar link is a placeholder, skipping');
      return null;
    }

    return data.calendar_link;
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
