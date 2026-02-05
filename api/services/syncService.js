const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');
const LemlistClient = require('../clients/lemlist');
const { config } = require('../config');
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

      let synced = 0;

      for (const campaign of campaigns) {
        // Derive owner from campaign name (e.g., "Alec - Contact Us" -> "alec")
        const ownerMatch = campaign.name?.match(/^(Alec|Janae|Kate)/i);
        const owner = ownerMatch ? ownerMatch[1].toLowerCase() : null;

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
