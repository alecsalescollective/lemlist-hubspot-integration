const { createLogger, generateCorrelationId } = require('../utils/logger');
const { withRetry } = require('../utils/retry');

const logger = createLogger('lead-pipeline');

/**
 * Lead Pipeline (Trigger-Based)
 * Searches for contacts with add_to_lemlist=true, adds them to Lemlist campaigns based on owner
 */
class LeadPipeline {
  /**
   * Create a lead pipeline
   * @param {Object} hubspotClient - HubSpot API client (read-only)
   * @param {Object} lemlistClient - Lemlist API client
   * @param {Object} stateStore - SQLite state store
   * @param {Object} config - Application config
   * @param {Object} alertManager - Email alert manager (optional)
   */
  constructor(hubspotClient, lemlistClient, stateStore, config, alertManager = null) {
    this.hubspot = hubspotClient;
    this.lemlist = lemlistClient;
    this.stateStore = stateStore;
    this.config = config;
    this.alertManager = alertManager;
    this.isRunning = false;
  }

  /**
   * Run the lead pipeline
   * @returns {Promise<Object>} Pipeline run results
   */
  async run() {
    if (this.isRunning) {
      logger.warn('Lead pipeline already running, skipping');
      return { skipped: true, reason: 'already_running' };
    }

    this.isRunning = true;
    const correlationId = generateCorrelationId();
    const runLogger = logger.child({ correlationId });

    runLogger.info('Starting lead pipeline run');

    const results = {
      correlationId,
      startedAt: new Date().toISOString(),
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duplicates: 0,
      excluded: 0,
      errors: []
    };

    try {
      const routing = this.config.routing;

      // Get AI context field names (HubSpot property names) to fetch
      const aiContextProps = routing.ai_context_fields
        ? Object.values(routing.ai_context_fields)
        : [];

      // Search for contacts where trigger field is set to trigger value
      const contacts = await this.hubspot.searchTriggeredContacts(
        routing.trigger_field,
        routing.trigger_value,
        aiContextProps
      );

      runLogger.info(
        { triggerField: routing.trigger_field, count: contacts.length, aiContextFields: aiContextProps },
        'Found contacts with trigger field set'
      );

      if (contacts.length === 0) {
        runLogger.info('No triggered contacts found');
        results.completedAt = new Date().toISOString();
        results.durationMs = new Date(results.completedAt) - new Date(results.startedAt);
        return results;
      }

      // Process each triggered contact
      for (const contact of contacts) {
        results.processed++;

        try {
          const result = await this.processContact(contact, runLogger);

          if (result.excluded) {
            results.excluded++;
          } else if (result.skipped) {
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

          runLogger.error(
            { contactId: contact.id, error: error.message },
            'Failed to process contact'
          );

          // Record failure for alerting
          if (this.alertManager) {
            await this.alertManager.recordFailure('lead', error, {
              contactId: contact.id
            });
          }
        }
      }

      results.completedAt = new Date().toISOString();
      results.durationMs = new Date(results.completedAt) - new Date(results.startedAt);

      runLogger.info(
        {
          processed: results.processed,
          succeeded: results.succeeded,
          failed: results.failed,
          skipped: results.skipped,
          excluded: results.excluded,
          duplicates: results.duplicates,
          durationMs: results.durationMs
        },
        'Lead pipeline run complete'
      );

      // Record success with alert manager
      if (this.alertManager && results.failed === 0) {
        this.alertManager.recordSuccess('lead');
      }

    } catch (error) {
      results.error = error.message;
      runLogger.error({ error: error.message }, 'Lead pipeline error');

      // Record failure with alert manager
      if (this.alertManager) {
        await this.alertManager.recordFailure('lead', error, {
          correlationId,
          results
        });
      }
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  /**
   * Process a single contact - check state and add to Lemlist if new
   * @param {Object} contact - HubSpot contact object
   * @param {Object} runLogger - Logger with correlation ID
   * @returns {Promise<{skipped?: boolean, duplicate?: boolean}>}
   */
  async processContact(contact, runLogger) {
    const contactId = contact.id;
    const props = contact.properties || {};
    const email = props.email;

    if (!email) {
      runLogger.warn({ contactId }, 'Contact missing email, skipping');
      return { skipped: true };
    }

    // Check exclusion rules before processing
    const exclusionResult = this.checkExclusions(props);
    if (exclusionResult.excluded) {
      runLogger.info(
        { contactId, email, reason: exclusionResult.reason },
        'Contact excluded by rule'
      );
      return { excluded: true, reason: exclusionResult.reason };
    }

    // Get owner name from owner ID
    const ownerId = props.hubspot_owner_id;
    const ownerName = this.config.routing.owners[ownerId];

    if (!ownerName) {
      runLogger.warn(
        { contactId, ownerId },
        'Unknown owner ID - skipping (owner not in routing config)'
      );
      return { skipped: true };
    }

    // Get campaign for this owner
    const campaignId = this.config.routing.campaigns[ownerName];

    if (!campaignId || campaignId === 'PLACEHOLDER') {
      runLogger.warn(
        { contactId, ownerName },
        'No campaign configured for owner - skipping'
      );
      return { skipped: true };
    }

    const logContext = { contactId, email, ownerName, campaignId };

    // Check if already processed in Supabase state store
    if (await this.stateStore.isProcessed(contactId)) {
      runLogger.debug(logContext, 'Contact already processed (in state store), skipping');
      return { skipped: true };
    }

    // Also check by email (in case contact ID changed)
    if (await this.stateStore.isEmailProcessed(email)) {
      runLogger.debug(logContext, 'Email already processed, skipping');
      return { skipped: true };
    }

    runLogger.debug(logContext, 'Processing contact');

    // Check if lead already exists in Lemlist (deduplication)
    const existingLead = await withRetry(
      () => this.lemlist.checkLeadExists(campaignId, email),
      {
        maxAttempts: this.config.retry.maxAttempts,
        baseDelayMs: this.config.retry.baseDelayMs,
        operationName: 'checkLeadExists'
      }
    );

    if (existingLead) {
      runLogger.info(logContext, 'Lead already exists in Lemlist, marking as processed');

      // Mark as processed in Supabase state store
      await this.stateStore.markProcessed(contactId, {
        email,
        owner: ownerName,
        campaignId,
        leadSource: props.lead_source || 'trigger'
      });

      return { duplicate: true };
    }

    // Build lead payload
    let leadPayload = this.buildLeadPayload(contact);

    // Enrich the lead before adding to campaign
    runLogger.debug(logContext, 'Enriching lead data');
    try {
      leadPayload = await this.lemlist.enrichLead(leadPayload, {
        maxWaitMs: 30000,
        pollIntervalMs: 2000
      });

      if (leadPayload.enriched) {
        runLogger.info(
          { ...logContext, enrichedFields: this.getEnrichedFields(leadPayload) },
          'Lead enrichment completed'
        );
      }
    } catch (enrichError) {
      // Log but don't fail - continue with original data
      runLogger.warn(
        { ...logContext, error: enrichError.message },
        'Lead enrichment failed, continuing with original data'
      );
    }

    runLogger.debug(logContext, 'Adding lead to campaign');

    // Add lead to Lemlist
    await withRetry(
      () => this.lemlist.addLeadToCampaign(campaignId, leadPayload),
      {
        maxAttempts: this.config.retry.maxAttempts,
        baseDelayMs: this.config.retry.baseDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        operationName: 'addLeadToCampaign',
        onRetry: (info) => {
          runLogger.warn(
            { ...logContext, attempt: info.attempt, delay: info.delay },
            'Retrying add lead to campaign'
          );
        }
      }
    );

    // Mark as processed in Supabase state store
    await this.stateStore.markProcessed(contactId, {
      email,
      owner: ownerName,
      campaignId,
      leadSource: props.lead_source || 'trigger'
    });

    runLogger.info(logContext, 'Contact added to Lemlist campaign');

    return {};
  }

  /**
   * Check if contact should be excluded based on exclusion rules
   * @param {Object} props - Contact properties
   * @returns {{excluded: boolean, reason?: string}}
   */
  checkExclusions(props) {
    const rules = this.config.routing.exclusion_rules || {};

    // Check lifecycle stage exclusion (skip customers and evangelists)
    if (rules.exclude_lifecycle_stages?.length > 0) {
      const lifecycle = props.lifecyclestage?.toLowerCase();
      if (lifecycle && rules.exclude_lifecycle_stages.includes(lifecycle)) {
        return { excluded: true, reason: `lifecyclestage_${lifecycle}` };
      }
    }

    // Check email opt-out exclusion (skip do-not-contact)
    if (rules.exclude_if_email_optout) {
      if (props.hs_email_optout === 'true' || props.hs_email_optout === true) {
        return { excluded: true, reason: 'email_optout' };
      }
    }

    return { excluded: false };
  }

  /**
   * Build the lead payload for Lemlist
   * @param {Object} contact - HubSpot contact object
   * @returns {Object} Lemlist lead payload
   */
  buildLeadPayload(contact) {
    const props = contact.properties || {};
    const mappings = this.config.routing.field_mappings;
    const aiFields = this.config.routing.ai_context_fields || {};

    // Base payload with standard fields
    const payload = {
      email: props[mappings.email],
      firstName: props[mappings.firstName] || '',
      lastName: props[mappings.lastName] || '',
      companyName: props[mappings.companyName] || ''
    };

    // Add AI context fields as custom variables for Lemlist AI personalization
    // These become available as {{leadSource}}, {{problemHypothesis}}, etc.
    for (const [lemlistVar, hubspotProp] of Object.entries(aiFields)) {
      const value = props[hubspotProp];
      if (value !== null && value !== undefined && value !== '') {
        payload[lemlistVar] = String(value);
      }
    }

    return payload;
  }

  /**
   * Get list of fields that were enriched
   * @param {Object} leadPayload - Enriched lead payload
   * @returns {string[]} Array of enriched field names
   */
  getEnrichedFields(leadPayload) {
    const enrichedFields = [];
    if (leadPayload.linkedinUrl) enrichedFields.push('linkedinUrl');
    if (leadPayload.jobTitle) enrichedFields.push('jobTitle');
    if (leadPayload.phone) enrichedFields.push('phone');
    if (leadPayload.enriched) enrichedFields.push('verified');
    return enrichedFields;
  }

  /**
   * Check if pipeline is currently running
   * @returns {boolean}
   */
  isActive() {
    return this.isRunning;
  }

  /**
   * Get statistics from the state store
   * @returns {Object}
   */
  getStats() {
    return this.stateStore.getStats();
  }
}

module.exports = LeadPipeline;
