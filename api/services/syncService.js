const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');
const LemlistClient = require('../clients/lemlist');
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

      // Fetch campaigns from Lemlist
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

      let synced = 0;

      for (const campaign of campaigns) {
        // Look up owner from routing config; if shared by multiple owners, store null (team-wide)
        const owners = campaignOwnerMap[campaign._id] || [];
        const owner = owners.length === 1 ? owners[0] : null;

        // Calculate rates
        const emailsSent = campaign.emailsSent || campaign.totalLeads || 0;
        const emailsOpened = campaign.emailsOpened || 0;
        const emailsReplied = campaign.emailsReplied || 0;
        const emailsBounced = campaign.emailsBounced || 0;

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
            leads_count: campaign.totalLeads || 0,
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

        // Build owner lookup from processed_leads
        const emails = leads.map(l => l.email).filter(Boolean);
        const { data: processedLeads } = await supabase
          .from('processed_leads')
          .select('email, owner')
          .in('email', emails.slice(0, 100)); // Limit batch size

        const ownerByEmail = {};
        (processedLeads || []).forEach(pl => {
          ownerByEmail[pl.email?.toLowerCase()] = pl.owner;
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
