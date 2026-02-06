const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');

const logger = createLogger('dashboard-service');

// Lazy initialization for serverless environment
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

/**
 * Dashboard Service
 * Handles all Supabase queries for the dashboard API
 */
class DashboardService {
  // ==========================================
  // LEADS
  // ==========================================

  /**
   * Get lead summary with counts by owner, status, source
   */
  async getLeadsSummary(owner = null, dateRange = '7d') {
    const dateFilter = this.getDateFilter(dateRange);
    const previousDateFilter = this.getPreviousDateFilter(dateRange);

    // Current period counts
    let query = getSupabase()
      .from('processed_leads')
      .select('*', { count: 'exact' });

    if (owner && owner !== 'all') {
      query = query.eq('owner', owner);
    }
    if (dateFilter) {
      query = query.gte('processed_at', dateFilter);
    }

    const { data: currentLeads, count: totalCount, error } = await query;
    if (error) throw error;

    // Previous period count for delta
    let prevQuery = getSupabase()
      .from('processed_leads')
      .select('*', { count: 'exact', head: true });

    if (owner && owner !== 'all') {
      prevQuery = prevQuery.eq('owner', owner);
    }
    if (previousDateFilter) {
      prevQuery = prevQuery
        .gte('processed_at', previousDateFilter.start)
        .lt('processed_at', previousDateFilter.end);
    }

    const { count: prevCount } = await prevQuery;
    const delta = totalCount - (prevCount || 0);

    // Group by owner
    const byOwner = this.groupBy(currentLeads || [], 'owner');

    // Group by lead_source
    const bySource = this.groupBy(currentLeads || [], 'lead_source');

    // For status, we'll derive from campaign_id presence
    // If campaign_id exists, they're "in_sequence"
    const inSequence = (currentLeads || []).filter(l => l.campaign_id).length;
    const byStatus = {
      new: totalCount - inSequence,
      in_sequence: inSequence,
      // These would come from meetings table
      converted: 0
    };

    return {
      total: totalCount || 0,
      delta,
      byOwner: Object.entries(byOwner).map(([owner, leads]) => ({
        owner,
        count: leads.length,
        delta: 0 // Would need historical data
      })),
      byStatus,
      bySource: Object.entries(bySource).map(([source, leads]) => ({
        source: source || 'unknown',
        count: leads.length
      })),
      period: dateRange,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get paginated leads list
   */
  async getLeads(owner = null, limit = 50, offset = 0) {
    let query = getSupabase()
      .from('processed_leads')
      .select('*', { count: 'exact' })
      .order('processed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (owner && owner !== 'all') {
      query = query.eq('owner', owner);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      leads: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0)
      }
    };
  }

  // ==========================================
  // CAMPAIGNS
  // ==========================================

  /**
   * Get all campaigns with metrics
   */
  async getCampaigns(owner = null) {
    let query = getSupabase()
      .from('campaigns')
      .select('*')
      .eq('lemlist_campaign_id', 'cam_DXge9ffvr6za36sJi')  // Only show Inbound AI Automated campaign
      .order('synced_at', { ascending: false });

    if (owner && owner !== 'all') {
      query = query.eq('owner', owner);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get sync status
    const { data: syncData } = await getSupabase()
      .from('sync_status')
      .select('last_sync_at')
      .eq('sync_type', 'campaigns')
      .single();

    return {
      campaigns: (data || []).map(c => ({
        id: c.lemlist_campaign_id,
        name: c.name,
        owner: c.owner,
        status: c.status,
        metrics: {
          leadsCount: c.leads_count,
          emailsSent: c.emails_sent,
          emailsOpened: c.emails_opened,
          emailsReplied: c.emails_replied,
          emailsBounced: c.emails_bounced,
          openRate: c.open_rate,
          replyRate: c.reply_rate,
          bounceRate: c.bounce_rate
        },
        syncedAt: c.synced_at
      })),
      lastUpdated: syncData?.last_sync_at || null
    };
  }

  /**
   * Get single campaign by ID
   */
  async getCampaignById(campaignId) {
    const { data, error } = await getSupabase()
      .from('campaigns')
      .select('*')
      .eq('lemlist_campaign_id', campaignId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.lemlist_campaign_id,
      name: data.name,
      owner: data.owner,
      status: data.status,
      metrics: {
        leadsCount: data.leads_count,
        emailsSent: data.emails_sent,
        emailsOpened: data.emails_opened,
        emailsReplied: data.emails_replied,
        emailsBounced: data.emails_bounced,
        openRate: data.open_rate,
        replyRate: data.reply_rate,
        bounceRate: data.bounce_rate
      },
      syncedAt: data.synced_at
    };
  }

  // ==========================================
  // TASKS
  // ==========================================

  /**
   * Get all tasks with optional filters
   */
  async getTasks(owner = null, dueFilter = 'all') {
    let query = getSupabase()
      .from('tasks')
      .select('*')
      .order('due_at', { ascending: true });

    if (owner && owner !== 'all') {
      query = query.eq('owner', owner);
    }

    // Apply due date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (dueFilter === 'overdue') {
      query = query.lt('due_at', now.toISOString()).neq('status', 'completed');
    } else if (dueFilter === 'today') {
      query = query
        .gte('due_at', today.toISOString())
        .lt('due_at', tomorrow.toISOString());
    } else if (dueFilter === 'upcoming') {
      query = query
        .gte('due_at', tomorrow.toISOString())
        .lt('due_at', nextWeek.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Calculate counts
    const allTasks = data || [];
    const counts = {
      overdue: allTasks.filter(t => new Date(t.due_at) < now && t.status !== 'completed').length,
      today: allTasks.filter(t => {
        const d = new Date(t.due_at);
        return d >= today && d < tomorrow;
      }).length,
      upcoming: allTasks.filter(t => {
        const d = new Date(t.due_at);
        return d >= tomorrow && d < nextWeek;
      }).length,
      completed: allTasks.filter(t => t.status === 'completed').length
    };

    return {
      tasks: allTasks.map(t => ({
        id: t.external_task_id,  // Changed from hubspot_task_id
        type: t.type,
        subject: t.subject,
        owner: t.owner,
        status: t.status,
        priority: t.priority,
        dueAt: t.due_at,
        contactName: t.contact_name,
        contactCompany: t.contact_company,
        contactEmail: t.contact_email
      })),
      counts
    };
  }

  /**
   * Get overdue tasks only
   */
  async getOverdueTasks(owner = null) {
    return this.getTasks(owner, 'overdue');
  }

  // ==========================================
  // MEETINGS
  // ==========================================

  /**
   * Get all meetings with optional filters
   */
  async getMeetings(owner = null, dateFilter = 'all') {
    let query = getSupabase()
      .from('meetings')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (owner && owner !== 'all') {
      query = query.eq('owner', owner);
    }

    const now = new Date();
    if (dateFilter === 'upcoming') {
      query = query.gte('scheduled_at', now.toISOString());
    } else if (dateFilter === 'past') {
      query = query.lt('scheduled_at', now.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      meetings: (data || []).map(m => ({
        id: m.lemcal_meeting_id,  // Changed from hubspot_meeting_id
        title: m.title,
        owner: m.owner,
        scheduledAt: m.scheduled_at,
        endAt: m.end_at,
        outcome: m.outcome,
        contactName: m.contact_name,
        contactCompany: m.contact_company,
        contactEmail: m.contact_email,
        sourceCampaign: m.source_campaign
      }))
    };
  }

  /**
   * Get meeting statistics by owner
   */
  async getMeetingStats(owner = null, dateRange = '30d') {
    const dateFilter = this.getDateFilter(dateRange);

    let query = getSupabase().from('meetings').select('*');

    if (owner && owner !== 'all') {
      query = query.eq('owner', owner);
    }
    if (dateFilter) {
      query = query.gte('scheduled_at', dateFilter);
    }

    const { data: meetings, error } = await query;
    if (error) throw error;

    // Get total leads for conversion calculation
    let leadsQuery = getSupabase()
      .from('processed_leads')
      .select('*', { count: 'exact' });

    if (owner && owner !== 'all') {
      leadsQuery = leadsQuery.eq('owner', owner);
    }
    if (dateFilter) {
      leadsQuery = leadsQuery.gte('processed_at', dateFilter);
    }

    const { count: totalLeads } = await leadsQuery;

    // Calculate stats by owner
    const meetingsByOwner = this.groupBy(meetings || [], 'owner');
    const stats = Object.entries(meetingsByOwner).map(([ownerName, ownerMeetings]) => {
      const completed = ownerMeetings.filter(m => m.outcome === 'completed').length;
      const noShow = ownerMeetings.filter(m => m.outcome === 'no_show').length;
      const scheduled = ownerMeetings.filter(m => m.outcome === 'scheduled').length;
      const total = ownerMeetings.length;

      return {
        owner: ownerName,
        total,
        completed,
        noShow,
        scheduled,
        conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });

    const totalMeetings = meetings?.length || 0;
    const totalCompleted = meetings?.filter(m => m.outcome === 'completed').length || 0;

    return {
      stats,
      overall: {
        totalMeetings,
        totalLeads: totalLeads || 0,
        conversionRate: (totalLeads || 0) > 0
          ? Math.round((totalCompleted / (totalLeads || 1)) * 1000) / 10
          : 0
      }
    };
  }

  // ==========================================
  // SYNC STATUS
  // ==========================================

  /**
   * Get sync status for all data types
   */
  async getSyncStatus() {
    const { data, error } = await getSupabase()
      .from('sync_status')
      .select('*')
      .order('sync_type');

    if (error) throw error;

    // Calculate next sync time (5 minutes from last sync)
    const syncs = (data || []).map(s => ({
      type: s.sync_type,
      lastSyncAt: s.last_sync_at,
      status: s.status,
      recordsSynced: s.records_synced,
      errorMessage: s.error_message,
      nextSyncAt: s.last_sync_at
        ? new Date(new Date(s.last_sync_at).getTime() + 5 * 60 * 1000).toISOString()
        : null
    }));

    return { syncs };
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(syncType, status, recordsSynced = 0, errorMessage = null) {
    const { error } = await getSupabase()
      .from('sync_status')
      .upsert({
        sync_type: syncType,
        last_sync_at: new Date().toISOString(),
        status,
        records_synced: recordsSynced,
        error_message: errorMessage
      }, { onConflict: 'sync_type' });

    if (error) throw error;
  }

  // ==========================================
  // FUNNEL STATS
  // ==========================================

  /**
   * Get funnel statistics: Leads -> In Sequence -> Meetings Booked
   * Note: Funnel ends at meetings booked - outcomes require Salesforce integration
   */
  async getFunnelStats(owner = null, dateRange = '30d') {
    const dateFilter = this.getDateFilter(dateRange);
    const previousDateFilter = this.getPreviousDateFilter(dateRange);

    // Stage 1: Total Leads (from processed_leads)
    let leadsQuery = getSupabase()
      .from('processed_leads')
      .select('*', { count: 'exact' });

    if (owner && owner !== 'all') {
      leadsQuery = leadsQuery.eq('owner', owner);
    }
    if (dateFilter) {
      leadsQuery = leadsQuery.gte('processed_at', dateFilter);
    }

    const { data: leads, count: totalLeads, error: leadsError } = await leadsQuery;
    if (leadsError) throw leadsError;

    // Stage 2: In Sequence (leads with campaign_id in processed_leads)
    const inSequence = (leads || []).filter(l => l.campaign_id).length;

    // Stage 3: Meetings Booked (from meetings table)
    let meetingsQuery = getSupabase()
      .from('meetings')
      .select('*', { count: 'exact' });

    if (owner && owner !== 'all') {
      meetingsQuery = meetingsQuery.eq('owner', owner);
    }
    if (dateFilter) {
      meetingsQuery = meetingsQuery.gte('scheduled_at', dateFilter);
    }

    const { count: totalMeetings, error: meetingsError } = await meetingsQuery;
    if (meetingsError) throw meetingsError;

    // Previous period for trend calculation
    let prevLeadsQuery = getSupabase()
      .from('processed_leads')
      .select('*', { count: 'exact', head: true });

    if (owner && owner !== 'all') {
      prevLeadsQuery = prevLeadsQuery.eq('owner', owner);
    }
    if (previousDateFilter) {
      prevLeadsQuery = prevLeadsQuery
        .gte('processed_at', previousDateFilter.start)
        .lt('processed_at', previousDateFilter.end);
    }

    const { count: prevLeads } = await prevLeadsQuery;

    let prevMeetingsQuery = getSupabase()
      .from('meetings')
      .select('*', { count: 'exact', head: true });

    if (owner && owner !== 'all') {
      prevMeetingsQuery = prevMeetingsQuery.eq('owner', owner);
    }
    if (previousDateFilter) {
      prevMeetingsQuery = prevMeetingsQuery
        .gte('scheduled_at', previousDateFilter.start)
        .lt('scheduled_at', previousDateFilter.end);
    }

    const { count: prevMeetings } = await prevMeetingsQuery;

    // Calculate conversion rates
    const leadToSequenceRate = (totalLeads || 0) > 0
      ? Math.round((inSequence / totalLeads) * 1000) / 10
      : 0;

    const sequenceToMeetingRate = inSequence > 0
      ? Math.round(((totalMeetings || 0) / inSequence) * 1000) / 10
      : 0;

    const leadToMeetingRate = (totalLeads || 0) > 0
      ? Math.round(((totalMeetings || 0) / totalLeads) * 1000) / 10
      : 0;

    // Previous period lead-to-meeting rate for trend
    const prevLeadToMeetingRate = (prevLeads || 0) > 0
      ? Math.round(((prevMeetings || 0) / prevLeads) * 1000) / 10
      : 0;

    const leadToMeetingTrend = leadToMeetingRate - prevLeadToMeetingRate;

    return {
      stages: [
        { name: 'Total Leads', count: totalLeads || 0, color: '#6B7280' },
        { name: 'In Sequence', count: inSequence, color: '#3B82F6' },
        { name: 'Meetings Booked', count: totalMeetings || 0, color: '#10B981' }
      ],
      conversions: {
        leadToSequence: leadToSequenceRate,
        sequenceToMeeting: sequenceToMeetingRate,
        leadToMeeting: leadToMeetingRate
      },
      trend: {
        leadToMeeting: Math.round(leadToMeetingTrend * 10) / 10
      },
      period: dateRange,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get recent lead activities (from lead_activities table)
   * Falls back to campaign metrics if no activity table exists
   */
  async getLeadActivities(owner = null, limit = 20) {
    try {
      // Try to get from lead_activities table
      let query = getSupabase()
        .from('lead_activities')
        .select('*')
        .order('activity_at', { ascending: false })
        .limit(limit);

      if (owner && owner !== 'all') {
        query = query.eq('owner', owner);
      }

      const { data, error } = await query;

      if (error) {
        // Table might not exist yet, return empty
        logger.warn({ error: error.message }, 'Lead activities table not available');
        return {
          activities: [],
          counts: { opens: 0, replies: 0, clicks: 0 },
          message: 'Activity tracking not yet configured'
        };
      }

      // Calculate counts by type
      const counts = {
        opens: (data || []).filter(a => a.activity_type === 'email_opened').length,
        replies: (data || []).filter(a => a.activity_type === 'email_replied').length,
        clicks: (data || []).filter(a => a.activity_type === 'email_clicked').length
      };

      return {
        activities: (data || []).map(a => ({
          id: a.id,
          type: a.activity_type,
          email: a.lead_email,
          contactName: a.contact_name || a.lead_email.split('@')[0],
          campaign: a.campaign_name,
          campaignId: a.campaign_id,
          owner: a.owner,
          timestamp: a.activity_at
        })),
        counts
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Error fetching lead activities');
      return {
        activities: [],
        counts: { opens: 0, replies: 0, clicks: 0 },
        error: error.message
      };
    }
  }

  /**
   * Get campaigns with meeting attribution
   */
  async getCampaignsWithMeetings(owner = null) {
    const { campaigns } = await this.getCampaigns(owner);

    // Get meetings grouped by source campaign
    let meetingsQuery = getSupabase()
      .from('meetings')
      .select('source_campaign');

    if (owner && owner !== 'all') {
      meetingsQuery = meetingsQuery.eq('owner', owner);
    }

    const { data: meetings } = await meetingsQuery;

    // Count meetings per campaign
    const meetingsByCampaign = {};
    (meetings || []).forEach(m => {
      if (m.source_campaign) {
        meetingsByCampaign[m.source_campaign] = (meetingsByCampaign[m.source_campaign] || 0) + 1;
      }
    });

    // Enhance campaigns with meeting data
    return {
      campaigns: campaigns.map(c => ({
        ...c,
        metrics: {
          ...c.metrics,
          meetingsBooked: meetingsByCampaign[c.id] || 0,
          meetingConversionRate: c.metrics.leadsCount > 0
            ? Math.round(((meetingsByCampaign[c.id] || 0) / c.metrics.leadsCount) * 1000) / 10
            : 0
        }
      }))
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Get date filter based on range string
   */
  getDateFilter(dateRange) {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case '7d':
        const week = new Date(now);
        week.setDate(week.getDate() - 7);
        return week.toISOString();
      case '30d':
        const month = new Date(now);
        month.setDate(month.getDate() - 30);
        return month.toISOString();
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      default:
        return null;
    }
  }

  /**
   * Get previous period date range for delta calculation
   */
  getPreviousDateFilter(dateRange) {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);
        return { start: weekStart.toISOString(), end: weekEnd.toISOString() };
      case '30d':
        const monthEnd = new Date(now);
        monthEnd.setDate(monthEnd.getDate() - 30);
        const monthStart = new Date(monthEnd);
        monthStart.setDate(monthStart.getDate() - 30);
        return { start: monthStart.toISOString(), end: monthEnd.toISOString() };
      default:
        return null;
    }
  }

  /**
   * Group array by key
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key] || 'unknown';
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  }
}

module.exports = new DashboardService();
