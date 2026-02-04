const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../../src/utils/logger');
const HubSpotClient = require('../../src/services/hubspot');
const LemlistClient = require('../../src/services/lemlist');
const { config } = require('../../src/config');

const logger = createLogger('sync-service');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const hubspot = new HubSpotClient(config.hubspot);
const lemlist = new LemlistClient(config.lemlist);

// Owner ID to name mapping from config
const ownerIdToName = config.routing.owners;
const ownerNameToId = Object.fromEntries(
  Object.entries(ownerIdToName).map(([id, name]) => [name, id])
);

/**
 * Sync Service
 * Handles syncing data from HubSpot and Lemlist to Supabase
 */
class SyncService {
  /**
   * Trigger a sync for specified type or all types
   */
  async triggerSync(type = 'all') {
    const results = {};

    try {
      if (type === 'all' || type === 'campaigns') {
        results.campaigns = await this.syncCampaigns();
      }

      if (type === 'all' || type === 'tasks') {
        results.tasks = await this.syncTasks();
      }

      if (type === 'all' || type === 'meetings') {
        results.meetings = await this.syncMeetings();
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
   * Sync HubSpot tasks to Supabase
   */
  async syncTasks() {
    logger.info('Starting tasks sync');

    try {
      await this.updateSyncStatus('tasks', 'in_progress');

      // Get owner IDs
      const ownerIds = Object.keys(ownerIdToName);
      let allTasks = [];

      // Fetch tasks for each owner
      for (const ownerId of ownerIds) {
        try {
          const tasks = await this.fetchHubSpotTasks(ownerId);
          allTasks = allTasks.concat(tasks.map(t => ({
            ...t,
            ownerName: ownerIdToName[ownerId]
          })));
        } catch (error) {
          logger.warn({ ownerId, error: error.message }, 'Failed to fetch tasks for owner');
        }
      }

      logger.info({ count: allTasks.length }, 'Fetched tasks from HubSpot');

      let synced = 0;

      for (const task of allTasks) {
        const { error } = await supabase
          .from('tasks')
          .upsert({
            hubspot_task_id: task.id,
            type: this.mapTaskType(task.properties?.hs_task_type),
            subject: task.properties?.hs_task_subject || 'No subject',
            body: task.properties?.hs_task_body,
            owner: task.ownerName,
            status: this.mapTaskStatus(task.properties?.hs_task_status),
            priority: task.properties?.hs_task_priority?.toLowerCase(),
            due_at: task.properties?.hs_timestamp,
            contact_id: task.associations?.contacts?.[0]?.id,
            synced_at: new Date().toISOString()
          }, { onConflict: 'hubspot_task_id' });

        if (error) {
          logger.error({ error, taskId: task.id }, 'Failed to upsert task');
        } else {
          synced++;
        }
      }

      await this.updateSyncStatus('tasks', 'success', synced);

      logger.info({ synced }, 'Tasks sync completed');
      return { synced, total: allTasks.length };

    } catch (error) {
      await this.updateSyncStatus('tasks', 'failed', 0, error.message);
      throw error;
    }
  }

  /**
   * Sync HubSpot meetings to Supabase
   */
  async syncMeetings() {
    logger.info('Starting meetings sync');

    try {
      await this.updateSyncStatus('meetings', 'in_progress');

      // Get owner IDs
      const ownerIds = Object.keys(ownerIdToName);
      let allMeetings = [];

      // Fetch meetings for each owner
      for (const ownerId of ownerIds) {
        try {
          const meetings = await this.fetchHubSpotMeetings(ownerId);
          allMeetings = allMeetings.concat(meetings.map(m => ({
            ...m,
            ownerName: ownerIdToName[ownerId]
          })));
        } catch (error) {
          logger.warn({ ownerId, error: error.message }, 'Failed to fetch meetings for owner');
        }
      }

      logger.info({ count: allMeetings.length }, 'Fetched meetings from HubSpot');

      let synced = 0;

      for (const meeting of allMeetings) {
        const { error } = await supabase
          .from('meetings')
          .upsert({
            hubspot_meeting_id: meeting.id,
            title: meeting.properties?.hs_meeting_title || 'Meeting',
            owner: meeting.ownerName,
            scheduled_at: meeting.properties?.hs_meeting_start_time || meeting.properties?.hs_timestamp,
            end_at: meeting.properties?.hs_meeting_end_time,
            outcome: this.mapMeetingOutcome(meeting.properties?.hs_meeting_outcome),
            contact_id: meeting.associations?.contacts?.[0]?.id,
            notes: meeting.properties?.hs_meeting_body,
            synced_at: new Date().toISOString()
          }, { onConflict: 'hubspot_meeting_id' });

        if (error) {
          logger.error({ error, meetingId: meeting.id }, 'Failed to upsert meeting');
        } else {
          synced++;
        }
      }

      await this.updateSyncStatus('meetings', 'success', synced);

      logger.info({ synced }, 'Meetings sync completed');
      return { synced, total: allMeetings.length };

    } catch (error) {
      await this.updateSyncStatus('meetings', 'failed', 0, error.message);
      throw error;
    }
  }

  /**
   * Fetch tasks from HubSpot for a specific owner
   */
  async fetchHubSpotTasks(ownerId) {
    try {
      const response = await hubspot.client.post('/crm/v3/objects/tasks/search', {
        filterGroups: [{
          filters: [{
            propertyName: 'hubspot_owner_id',
            operator: 'EQ',
            value: ownerId
          }]
        }],
        properties: [
          'hs_task_subject',
          'hs_task_body',
          'hs_task_status',
          'hs_task_priority',
          'hs_task_type',
          'hs_timestamp',
          'hubspot_owner_id'
        ],
        limit: 100
      });

      return response.data?.results || [];
    } catch (error) {
      logger.error({ error: error.message, ownerId }, 'HubSpot tasks fetch failed');
      return [];
    }
  }

  /**
   * Fetch meetings from HubSpot for a specific owner
   */
  async fetchHubSpotMeetings(ownerId) {
    try {
      const response = await hubspot.client.post('/crm/v3/objects/meetings/search', {
        filterGroups: [{
          filters: [{
            propertyName: 'hubspot_owner_id',
            operator: 'EQ',
            value: ownerId
          }]
        }],
        properties: [
          'hs_meeting_title',
          'hs_meeting_body',
          'hs_meeting_start_time',
          'hs_meeting_end_time',
          'hs_meeting_outcome',
          'hs_timestamp',
          'hubspot_owner_id'
        ],
        limit: 100
      });

      return response.data?.results || [];
    } catch (error) {
      logger.error({ error: error.message, ownerId }, 'HubSpot meetings fetch failed');
      return [];
    }
  }

  /**
   * Update sync status in Supabase
   */
  async updateSyncStatus(syncType, status, recordsSynced = 0, errorMessage = null) {
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

  /**
   * Map HubSpot task type to our type
   */
  mapTaskType(hsType) {
    const typeMap = {
      'EMAIL': 'email',
      'CALL': 'call',
      'TODO': 'todo',
      'LINKEDIN_MESSAGE': 'linkedin',
      'LINKEDIN_CONNECT': 'linkedin'
    };
    return typeMap[hsType] || 'todo';
  }

  /**
   * Map HubSpot task status to our status
   */
  mapTaskStatus(hsStatus) {
    const statusMap = {
      'NOT_STARTED': 'pending',
      'IN_PROGRESS': 'in_progress',
      'WAITING': 'pending',
      'COMPLETED': 'completed',
      'DEFERRED': 'pending'
    };
    return statusMap[hsStatus] || 'pending';
  }

  /**
   * Map HubSpot meeting outcome to our outcome
   */
  mapMeetingOutcome(hsOutcome) {
    const outcomeMap = {
      'SCHEDULED': 'scheduled',
      'COMPLETED': 'completed',
      'NO_SHOW': 'no_show',
      'RESCHEDULED': 'rescheduled',
      'CANCELLED': 'cancelled'
    };
    return outcomeMap[hsOutcome] || 'scheduled';
  }
}

module.exports = new SyncService();
