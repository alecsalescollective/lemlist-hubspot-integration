const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');
const SalesforceClient = require('../clients/salesforce');
const { analyzeNurtureDeal } = require('../clients/anthropic');
const nurtureFields = require('../config/nurture-fields');

const logger = createLogger('nurture-service');

let supabase;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

class NurtureService {
  /**
   * Main entry point — called by cron or manual trigger.
   * Fetches new Closed Lost - Nurture opportunities, analyzes with AI,
   * and updates all associated Contacts.
   */
  async run() {
    logger.info('Starting nurture automation run');
    const sf = new SalesforceClient();

    try {
      const opportunities = await this.fetchNewClosedLostNurtureOpps(sf);

      if (opportunities.length === 0) {
        logger.info('No new Closed Lost - Nurture opportunities to process');
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      logger.info({ count: opportunities.length }, 'Found opportunities to process');

      let succeeded = 0;
      let failed = 0;

      for (const opp of opportunities) {
        try {
          await this.processOpportunity(sf, opp);
          succeeded++;
        } catch (error) {
          failed++;
          logger.error(
            { oppId: opp.Id, oppName: opp.Name, error: error.message },
            'Failed to process opportunity'
          );
          await this.markOpportunityProcessed(opp.Id, {
            status: 'failed',
            errorMessage: error.message,
          });
        }
      }

      logger.info({ processed: opportunities.length, succeeded, failed }, 'Nurture automation run completed');
      return { processed: opportunities.length, succeeded, failed };
    } catch (error) {
      logger.error({ error: error.message }, 'Nurture automation run failed');
      throw error;
    }
  }

  /**
   * Query Salesforce for Closed Lost - Nurture opportunities that haven't been
   * successfully processed yet. Uses a 30-day lookback window.
   */
  async fetchNewClosedLostNurtureOpps(sf) {
    const db = getSupabase();

    // Get already-succeeded opportunity IDs to exclude
    const { data: processed } = await db
      .from('nurture_processed_opportunities')
      .select('salesforce_opportunity_id')
      .eq('status', 'succeeded');

    const processedIds = new Set((processed || []).map(r => r.salesforce_opportunity_id));

    // Build the SOQL field list from config
    const oppFieldNames = Object.values(nurtureFields.opportunityFields);
    const selectFields = [
      'Id', 'Name', 'StageName', 'CloseDate',
      ...oppFieldNames,
      '(SELECT ContactId, Contact.Name, Contact.Email FROM OpportunityContactRoles)',
    ].join(', ');

    const stageName = sf.escapeSoqlLiteral(nurtureFields.STAGE_NAME);

    const soql = `
      SELECT ${selectFields}
      FROM Opportunity
      WHERE StageName = '${stageName}'
        AND CloseDate >= LAST_N_DAYS:30
      ORDER BY CloseDate DESC
    `;

    const opportunities = await sf.query(soql);

    // Filter out already-succeeded
    return opportunities.filter(opp => !processedIds.has(opp.Id));
  }

  /**
   * Process a single opportunity:
   * 1. Extract deal notes from opportunity fields
   * 2. Run AI analysis to get hypothesis + context summary
   * 3. PATCH each Contact on the opportunity's ContactRoles
   */
  async processOpportunity(sf, opp) {
    const oppName = opp.Name || opp.Id;
    logger.info({ oppId: opp.Id, oppName }, 'Processing opportunity');

    // 1. Extract deal notes
    const dealNotes = {};
    for (const [key, apiName] of Object.entries(nurtureFields.opportunityFields)) {
      dealNotes[key] = opp[apiName] || null;
    }

    // 2. AI analysis
    const { hypothesis, contextSummary } = await analyzeNurtureDeal(dealNotes, oppName);

    // 3. Get contact roles
    const contactRoles = opp.OpportunityContactRoles?.records || [];
    if (contactRoles.length === 0) {
      logger.warn({ oppId: opp.Id }, 'No ContactRoles found on opportunity');
      await this.markOpportunityProcessed(opp.Id, {
        status: 'succeeded',
        hypothesis,
        contactCount: 0,
      });
      return;
    }

    // 4. Update each Contact
    let contactsUpdated = 0;
    for (const role of contactRoles) {
      const contactId = role.ContactId;
      if (!contactId) continue;

      try {
        await sf.request({
          method: 'patch',
          path: `/services/data/${sf.apiVersion}/sobjects/Contact/${contactId}`,
          data: {
            [nurtureFields.contactFields.nurtureHypothesis]: hypothesis,
            [nurtureFields.contactFields.nurtureContext]: contextSummary,
          },
        });
        contactsUpdated++;
        logger.info(
          { contactId, contactName: role.Contact?.Name, hypothesis },
          'Updated contact with nurture data'
        );
      } catch (error) {
        // Log but don't fail the whole opportunity
        logger.error(
          { contactId, contactName: role.Contact?.Name, error: error.response?.data || error.message },
          'Failed to update contact'
        );
      }
    }

    // 5. Mark as processed
    await this.markOpportunityProcessed(opp.Id, {
      status: 'succeeded',
      hypothesis,
      contactCount: contactsUpdated,
    });

    logger.info(
      { oppId: opp.Id, oppName, hypothesis, contactsUpdated, totalContacts: contactRoles.length },
      'Opportunity processing complete'
    );
  }

  /**
   * Upsert a tracking record in Supabase for this opportunity.
   */
  async markOpportunityProcessed(opportunityId, { status, hypothesis = null, contactCount = 0, errorMessage = null }) {
    const db = getSupabase();

    const { error } = await db
      .from('nurture_processed_opportunities')
      .upsert({
        salesforce_opportunity_id: opportunityId,
        status,
        hypothesis,
        contact_count: contactCount,
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
      }, { onConflict: 'salesforce_opportunity_id' });

    if (error) {
      logger.error({ error: error.message, opportunityId }, 'Failed to upsert nurture tracking record');
    }
  }
}

module.exports = new NurtureService();
