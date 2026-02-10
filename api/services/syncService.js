const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');
const LemlistClient = require('../clients/lemlist');
const SalesforceClient = require('../clients/salesforce');
const { config } = require('../config');
const routingConfig = require('../config/routing.json');
const leadPipelineService = require('./leadPipelineService');

const logger = createLogger('sync-service');

// Initialize clients lazily (after env vars are loaded)
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
 * Sync Service
 * Handles syncing data from Lemlist to Supabase
 *
 * Data sources:
 * - Leads: HubSpot → Lemlist (via leadPipelineService)
 * - Campaigns: Lemlist API
 * - Meetings: Lemcal webhooks (not synced here - real-time via webhook)
 * - Activities: Lemlist webhooks (not synced here - real-time via webhook)
 */
class SyncService {
  /**
   * Trigger a sync for specified type or all types
   */
  async triggerSync(type = 'all') {
    const results = {};

    try {
      // Sync HubSpot leads to Lemlist (the main pipeline)
      if (type === 'all' || type === 'leads') {
        results.leads = await leadPipelineService.run();
      }

      if (type === 'all' || type === 'campaigns') {
        results.campaigns = await this.syncCampaigns();
      }

      if (type === 'all' || type === 'activities') {
        results.activities = await this.syncActivities();
      }

      // Note: Meetings come from Lemcal webhooks, not API sync
      if (type === 'meetings') {
        results.meetings = {
          synced: 0,
          message: 'Meetings are captured via Lemcal webhooks in real-time'
        };
      }

      // Sync Salesforce pipeline data
      if (type === 'all' || type === 'pipeline') {
        try {
          results.pipeline = await this.syncPipeline();
        } catch (error) {
          // Don't fail the whole sync if Salesforce isn't connected yet
          logger.warn({ error: error.message }, 'Pipeline sync skipped (Salesforce may not be connected)');
          results.pipeline = { synced: 0, message: error.message };
        }
      }

      return results;
    } catch (error) {
      logger.error({ error: error.message }, 'Sync failed');
      throw error;
    }
  }

  /**
   * Sync Lemlist campaigns to Supabase
   */
  async syncCampaigns() {
    logger.info('Starting campaigns sync');
    const { supabase, lemlist } = getClients();

    try {
      // Update status to in_progress
      await this.updateSyncStatus('campaigns', 'in_progress');

      // Fetch campaign list from Lemlist (metadata only, no metrics)
      const campaigns = await lemlist.getCampaigns();
      logger.info({ count: campaigns.length }, 'Fetched campaigns from Lemlist');

      // Build reverse map: campaignId -> owners from routing config
      const campaignOwnerMap = {};
      for (const [ownerName, campaignId] of Object.entries(routingConfig.campaigns || {})) {
        if (!campaignOwnerMap[campaignId]) {
          campaignOwnerMap[campaignId] = [];
        }
        campaignOwnerMap[campaignId].push(ownerName);
      }

      // Fetch actual metrics via /campaigns/reports endpoint (batched)
      const campaignIds = campaigns.map(c => c._id);
      let reportsMap = {};

      if (campaignIds.length > 0) {
        // Try batch reports endpoint first
        try {
          const reports = await lemlist.getCampaignReports(campaignIds);
          for (const report of (reports || [])) {
            reportsMap[report._id] = report;
          }
          logger.info({ count: Object.keys(reportsMap).length }, 'Fetched campaign reports with metrics');
        } catch (error) {
          logger.warn({ error: error.message }, 'Failed to fetch batch campaign reports');
        }

      }

      let synced = 0;

      for (const campaign of campaigns) {
        // Look up owner from routing config; if shared by multiple owners, store null (team-wide)
        const owners = campaignOwnerMap[campaign._id] || [];
        const owner = owners.length === 1 ? owners[0] : null;

        // Get metrics from reports endpoint (has actual stats)
        const report = reportsMap[campaign._id] || {};

        // Aggregate across all channels (email + LinkedIn + WhatsApp + SMS)
        const emailsSent = (report.emailsSent || 0) + (report.linkedinSent || 0);
        const emailsOpened = (report.emailsOpened || 0) + (report.linkedinOpened || 0);
        const emailsReplied = (report.emailsReplied || 0) + (report.linkedinReplied || 0) + (report.whatsappReplied || 0) + (report.smsReplied || 0);
        const emailsBounced = report.emailsBounced || 0;
        const leadsCount = report.totalCount || report.leadsCount || report.leadCount || 0;

        const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 1000) / 10 : 0;
        const replyRate = emailsSent > 0 ? Math.round((emailsReplied / emailsSent) * 1000) / 10 : 0;
        const bounceRate = emailsSent > 0 ? Math.round((emailsBounced / emailsSent) * 1000) / 10 : 0;

        const { error } = await supabase
          .from('campaigns')
          .upsert({
            lemlist_campaign_id: campaign._id,
            name: campaign.name,
            owner,
            status: campaign.status || 'active',
            leads_count: leadsCount,
            emails_sent: emailsSent,
            emails_opened: emailsOpened,
            emails_replied: emailsReplied,
            emails_bounced: emailsBounced,
            open_rate: openRate,
            reply_rate: replyRate,
            bounce_rate: bounceRate,
            synced_at: new Date().toISOString()
          }, { onConflict: 'lemlist_campaign_id' });

        if (error) {
          logger.error({ error, campaignId: campaign._id }, 'Failed to upsert campaign');
        } else {
          synced++;
        }
      }

      // Update status to success
      await this.updateSyncStatus('campaigns', 'success', synced);

      logger.info({ synced }, 'Campaigns sync completed');
      return { synced, total: campaigns.length };

    } catch (error) {
      await this.updateSyncStatus('campaigns', 'failed', 0, error.message);
      throw error;
    }
  }

  /**
   * Sync lead activities from Lemlist campaign export
   * Supplements webhook-based activity tracking
   */
  async syncActivities() {
    logger.info('Starting activities sync');
    const { supabase, lemlist } = getClients();

    try {
      await this.updateSyncStatus('activities', 'in_progress');

      // Get campaign IDs from routing config
      const campaignIds = [...new Set(Object.values(routingConfig.campaigns || {}))];
      let synced = 0;

      for (const campaignId of campaignIds) {
        if (!campaignId || campaignId === 'PLACEHOLDER') continue;

        // Fetch leads with their statuses from Lemlist
        let leads;
        try {
          leads = await lemlist.getCampaignLeadStatuses(campaignId);
        } catch (error) {
          logger.warn({ campaignId, error: error.message }, 'Failed to fetch campaign leads for activity sync');
          continue;
        }

        if (!Array.isArray(leads) || leads.length === 0) continue;

        // Get existing activities to avoid duplicates
        const { data: existingActivities } = await supabase
          .from('lead_activities')
          .select('lead_email, activity_type')
          .eq('campaign_id', campaignId);

        const existingSet = new Set(
          (existingActivities || []).map(a => `${a.lead_email}:${a.activity_type}`)
        );

        // Build owner + status lookup from processed_leads
        const emails = leads.map(l => l.email).filter(Boolean);
        const { data: processedLeads } = await supabase
          .from('processed_leads')
          .select('email, owner, status')
          .in('email', emails.slice(0, 100)); // Limit batch size

        const ownerByEmail = {};
        const statusByEmail = {};
        (processedLeads || []).forEach(pl => {
          const e = pl.email?.toLowerCase();
          ownerByEmail[e] = pl.owner;
          statusByEmail[e] = pl.status;
        });

        // Map Lemlist lead statuses to activity records
        const activitiesToInsert = [];

        for (const lead of leads) {
          if (!lead.email) continue;

          const email = lead.email.toLowerCase().trim();
          const owner = ownerByEmail[email] || null;
          const contactName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || null;
          const campaignName = lead.campaignName || null;

          // Check each activity type
          const activityChecks = [
            { flag: lead.isOpened || lead.emailsOpened > 0, type: 'email_opened' },
            { flag: lead.isReplied || lead.emailsReplied > 0, type: 'email_replied' },
            { flag: lead.isClicked || lead.emailsClicked > 0, type: 'email_clicked' },
          ];

          for (const { flag, type } of activityChecks) {
            if (flag && !existingSet.has(`${email}:${type}`)) {
              activitiesToInsert.push({
                lead_email: email,
                contact_name: contactName,
                activity_type: type,
                campaign_id: campaignId,
                campaign_name: campaignName,
                owner,
                activity_at: new Date().toISOString(),
                metadata: { source: 'api_sync' }
              });
            }
          }
        }

        if (activitiesToInsert.length > 0) {
          const { error } = await supabase
            .from('lead_activities')
            .insert(activitiesToInsert);

          if (error) {
            logger.error({ error: error.message, campaignId }, 'Failed to insert synced activities');
          } else {
            synced += activitiesToInsert.length;
          }
        }

        // Detect sequence_finished leads from Lemlist export data
        // Lemlist marks leads as done/finished when all steps have been sent
        const finishedEmails = [];
        for (const lead of leads) {
          if (!lead.email) continue;
          const email = lead.email.toLowerCase().trim();
          const currentStatus = statusByEmail[email];

          // Skip if already meeting_booked (higher priority status)
          if (currentStatus === 'meeting_booked') continue;
          // Skip if already sequence_finished
          if (currentStatus === 'sequence_finished') continue;

          // Lemlist export uses various flags for sequence completion
          const isFinished = lead.isFinished || lead.isDone ||
            lead.leadStatus === 'notInterested' ||
            lead.leadStatus === 'interested' ||
            lead.sequenceCompleted === true;

          if (isFinished) {
            finishedEmails.push(email);
          }
        }

        if (finishedEmails.length > 0) {
          const { error: statusError } = await supabase
            .from('processed_leads')
            .update({ status: 'sequence_finished' })
            .in('email', finishedEmails)
            .neq('status', 'meeting_booked');

          if (statusError) {
            logger.error({ error: statusError.message }, 'Failed to update sequence_finished statuses');
          } else {
            logger.info({ count: finishedEmails.length }, 'Updated leads to sequence_finished');
          }
        }
      }

      await this.updateSyncStatus('activities', 'success', synced);
      logger.info({ synced }, 'Activities sync completed');
      return { synced };

    } catch (error) {
      await this.updateSyncStatus('activities', 'failed', 0, error.message);
      logger.error({ error: error.message }, 'Activities sync failed');
      throw error;
    }
  }

  /**
   * Sync Salesforce pipeline data (Opportunities with Meeting_Held__c or Qualified__c)
   */
  async syncPipeline() {
    logger.info('Starting pipeline sync from Salesforce');
    const { supabase } = getClients();
    const salesforce = new SalesforceClient();

    try {
      await this.updateSyncStatus('pipeline', 'in_progress');

      // Query Opportunities with our custom checkboxes
      const soql = `
        SELECT Id, Amount, Meeting_Held__c, Qualified__c, CloseDate, StageName,
               (SELECT Contact.Email, Contact.Name FROM OpportunityContactRoles LIMIT 1)
        FROM Opportunity
        WHERE Meeting_Held__c = true OR Qualified__c = true
      `;

      const opportunities = await salesforce.query(soql);
      logger.info({ count: opportunities.length }, 'Fetched opportunities from Salesforce');

      let synced = 0;

      for (const opp of opportunities) {
        // Extract contact email from OpportunityContactRole
        const contactRoles = opp.OpportunityContactRoles?.records || [];
        const contactEmail = contactRoles[0]?.Contact?.Email?.toLowerCase()?.trim() || null;
        const contactName = contactRoles[0]?.Contact?.Name || null;

        // Determine stage
        let stage = 'meeting_held';
        if (opp.Qualified__c) {
          stage = 'qualified';
        }

        // Only track opportunities tied to our inbound leads
        if (!contactEmail) {
          logger.debug({ oppId: opp.Id }, 'Skipping opportunity with no contact email');
          continue;
        }

        const { data: leadRecord } = await supabase
          .from('processed_leads')
          .select('owner')
          .eq('email', contactEmail)
          .limit(1)
          .single();

        if (!leadRecord) {
          logger.debug({ oppId: opp.Id, email: contactEmail }, 'Skipping opportunity — contact not in processed_leads');
          continue;
        }

        const owner = leadRecord.owner || null;

        const { error } = await supabase
          .from('pipeline_opportunities')
          .upsert({
            salesforce_opportunity_id: opp.Id,
            contact_email: contactEmail,
            contact_name: contactName,
            owner,
            stage,
            pipeline_value: opp.Amount || 0,
            close_date: opp.CloseDate || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'salesforce_opportunity_id' });

        if (error) {
          logger.error({ error: error.message, oppId: opp.Id }, 'Failed to upsert opportunity');
        } else {
          synced++;
        }
      }

      await this.updateSyncStatus('pipeline', 'success', synced);
      logger.info({ synced }, 'Pipeline sync completed');
      return { synced, total: opportunities.length };

    } catch (error) {
      await this.updateSyncStatus('pipeline', 'failed', 0, error.message);
      logger.error({ error: error.message }, 'Pipeline sync failed');
      throw error;
    }
  }

  /**
   * Update sync status in Supabase
   */
  async updateSyncStatus(syncType, status, recordsSynced = 0, errorMessage = null) {
    const { supabase } = getClients();
    const { error } = await supabase
      .from('sync_status')
      .upsert({
        sync_type: syncType,
        last_sync_at: new Date().toISOString(),
        status,
        records_synced: recordsSynced,
        error_message: errorMessage
      }, { onConflict: 'sync_type' });

    if (error) {
      logger.error({ error, syncType }, 'Failed to update sync status');
    }
  }
}

module.exports = new SyncService();
