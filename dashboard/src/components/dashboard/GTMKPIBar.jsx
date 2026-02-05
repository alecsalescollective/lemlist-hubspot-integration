import { Target, MessageSquare, Percent, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { useFunnelStats } from '../../hooks/useFunnel';
import { useLeadsSummary } from '../../hooks/useLeads';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFilters } from '../../context/FilterContext';
import {
  typography,
  spacing,
  card,
  interactive,
  iconSizes
} from '../../styles/designTokens';

function KPICard({ title, value, delta, icon: Icon, loading, highlight = false }) {
  const isPositive = delta > 0;
  const hasChange = delta !== 0 && delta !== undefined;

  if (loading) {
    return (
      <div className={`${card.base} ${spacing.cardPadding} animate-pulse`}>
        <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  return (
    <div className={`${highlight ? card.highlighted : card.interactive} ${spacing.cardPadding}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={typography.label}>{title}</span>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-green-100' : 'bg-gray-100'}`}>
          <Icon className={`${iconSizes.md} ${highlight ? 'text-green-600' : 'text-gray-600'}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`${typography.hero} ${highlight ? 'text-green-600' : ''}`}>
          {value}
        </span>
        {hasChange && (
          <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'} ${interactive.transition}`}>
            {isPositive ? <TrendingUp className={`${iconSizes.sm} mr-0.5`} /> : <TrendingDown className={`${iconSizes.sm} mr-0.5`} />}
            {isPositive ? '+' : ''}{delta}
          </span>
        )}
      </div>
    </div>
  );
}

export default function GTMKPIBar() {
  const { owner, dateRange } = useFilters();
  const { data: funnelData, isLoading: funnelLoading } = useFunnelStats(owner, dateRange);
  const { data: leadData, isLoading: leadsLoading } = useLeadsSummary(owner, dateRange);
  const { data: campaignData, isLoading: campaignsLoading } = useCampaigns(owner);

  // Calculate average reply rate across all campaigns
  const campaigns = campaignData?.campaigns || [];
  const avgReplyRate = campaigns.length > 0
    ? Math.round(campaigns.reduce((sum, c) => sum + (c.metrics?.replyRate || 0), 0) / campaigns.length * 10) / 10
    : 0;

  // Total replies (sum of all campaign replies)
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.metrics?.emailsReplied || 0), 0);

  // Get funnel data
  const leadToMeetingRate = funnelData?.conversions?.leadToMeeting || 0;
  const leadToMeetingTrend = funnelData?.trend?.leadToMeeting || 0;

  // Get "in sequence" count from funnel or lead data
  const inSequence = funnelData?.stages?.find(s => s.name === 'In Sequence')?.count
    || leadData?.byStatus?.in_sequence
    || 0;

  const loading = funnelLoading || leadsLoading || campaignsLoading;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${spacing.cardGap} mb-8`}>
      <KPICard
        title="Lead to Meeting"
        value={`${leadToMeetingRate}%`}
        delta={leadToMeetingTrend !== 0 ? `${leadToMeetingTrend}%` : undefined}
        icon={Target}
        loading={loading}
        highlight={true}
      />
      <KPICard
        title="Total Replies"
        value={totalReplies.toLocaleString()}
        icon={MessageSquare}
        loading={loading}
      />
      <KPICard
        title="Avg Reply Rate"
        value={`${avgReplyRate}%`}
        icon={Percent}
        loading={loading}
      />
      <KPICard
        title="In Sequence"
        value={inSequence.toLocaleString()}
        delta={leadData?.delta}
        icon={Users}
        loading={loading}
      />
    </div>
  );
}
