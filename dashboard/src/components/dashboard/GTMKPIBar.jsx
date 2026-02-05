import { Target, MessageSquare, Percent, Users } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useFunnelStats } from '../../hooks/useFunnel';
import { useLeadsSummary } from '../../hooks/useLeads';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFilters } from '../../context/FilterContext';

function KPICard({ title, value, delta, icon: Icon, loading, highlight = false }) {
  const isPositive = delta > 0;
  const hasChange = delta !== 0 && delta !== undefined;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${highlight ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-green-100' : 'bg-gray-100'}`}>
          <Icon className={`w-5 h-5 ${highlight ? 'text-green-600' : 'text-gray-600'}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
          {value}
        </span>
        {hasChange && (
          <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4 mr-0.5" /> : <TrendingDown className="w-4 h-4 mr-0.5" />}
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
