import { Target, MessageSquare, Percent, Users } from 'lucide-react';
import { useFunnelStats } from '../../hooks/useFunnel';
import { useLeadsSummary } from '../../hooks/useLeads';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFilters } from '../../context/FilterContext';
import KPICard from './KPICard';

export default function GTMKPIBar() {
  const { owner, dateRange } = useFilters();
  const { data: funnelData, isLoading: funnelLoading } = useFunnelStats(owner, dateRange);
  const { data: leadData, isLoading: leadsLoading } = useLeadsSummary(owner, dateRange);
  const { data: campaignData, isLoading: campaignsLoading } = useCampaigns(owner);

  // Calculate average reply rate across all campaigns
  const campaigns = campaignData?.campaigns || [];
  const avgReplyRate =
    campaigns.length > 0
      ? Math.round(
          (campaigns.reduce((sum, c) => sum + (c.metrics?.replyRate || 0), 0) /
            campaigns.length) *
            10
        ) / 10
      : 0;

  // Total replies (sum of all campaign replies)
  const totalReplies = campaigns.reduce(
    (sum, c) => sum + (c.metrics?.emailsReplied || 0),
    0
  );

  // Get funnel data
  const leadToMeetingRate = funnelData?.conversions?.leadToMeeting || 0;
  const leadToMeetingTrend = funnelData?.trend?.leadToMeeting || 0;

  // Get "in sequence" count from funnel or lead data
  const inSequence =
    funnelData?.stages?.find((s) => s.name === 'In Sequence')?.count ||
    leadData?.byStatus?.in_sequence ||
    0;

  const loading = funnelLoading || leadsLoading || campaignsLoading;

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
      role="region"
      aria-label="Key Performance Indicators"
    >
      {/* Primary KPI - Lead to Meeting Rate */}
      <KPICard
        title="Lead to Meeting"
        value={`${leadToMeetingRate}%`}
        delta={leadToMeetingTrend !== 0 ? `${leadToMeetingTrend}%` : undefined}
        icon={Target}
        loading={loading}
        highlight="primary"
        metricType="conversionRate"
      />

      {/* Secondary KPI - Total Replies */}
      <KPICard
        title="Total Replies"
        value={totalReplies}
        icon={MessageSquare}
        loading={loading}
        highlight="secondary"
      />

      {/* Standard KPI - Average Reply Rate */}
      <KPICard
        title="Avg Reply Rate"
        value={`${avgReplyRate}%`}
        icon={Percent}
        loading={loading}
        highlight="none"
        metricType="replyRate"
      />

      {/* Standard KPI - In Sequence Count */}
      <KPICard
        title="In Sequence"
        value={inSequence}
        delta={leadData?.delta}
        icon={Users}
        loading={loading}
        highlight="none"
      />
    </div>
  );
}
