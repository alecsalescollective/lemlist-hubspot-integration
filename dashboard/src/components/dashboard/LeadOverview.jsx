import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Users } from 'lucide-react';
import { useLeadsSummary } from '../../hooks/useLeads';
import { useTriggerSync } from '../../hooks/useSync';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonChart } from '../ui';
import {
  typography,
  card,
  chartConfig,
  colors,
  getOwnerColors,
  statusColors,
} from '../../styles/designTokens';

export default function LeadOverview() {
  const { owner, dateRange } = useFilters();
  const { data, isLoading, error, refetch } = useLeadsSummary(owner, dateRange);
  const triggerSync = useTriggerSync();

  // Loading state
  if (isLoading) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
        <h2 className={`${typography.cardTitle} mb-4 sm:mb-6`}>Lead Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <SkeletonChart height="h-32 sm:h-40 lg:h-48" />
          <SkeletonChart height="h-32 sm:h-40 lg:h-48" />
          <SkeletonChart height="h-32 sm:h-40 lg:h-48" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Overview</h2>
        <ErrorState
          title="Error loading lead data"
          message={error.message}
          onRetry={refetch}
        />
      </div>
    );
  }

  // Prepare chart data
  const ownerData =
    data?.byOwner?.map((o) => ({
      name: o.owner?.charAt(0).toUpperCase() + o.owner?.slice(1) || 'Unknown',
      count: o.count,
      color: getOwnerColors(o.owner).bar,
    })) || [];

  const statusData = Object.entries(data?.byStatus || {}).map(([status, count]) => ({
    name: status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    count,
    color: statusColors[status]?.bar || statusColors.draft?.bar || '#6B7280',
  }));

  // Source colors for visual distinction
  const sourceColors = ['#14B8A6', '#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6', '#EF4444', '#10B981', '#6366F1'];

  // Use granular source detail when available, fall back to category
  const sourceData =
    (data?.bySourceDetail || data?.bySource)?.map((s, i) => ({
      name: s.source || 'Unknown',
      count: s.count,
      color: sourceColors[i % sourceColors.length],
    })) || [];

  const hasData = ownerData.length > 0 || statusData.length > 0 || sourceData.length > 0;

  // Empty state
  if (!hasData) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Overview</h2>
        <EmptyState
          icon={Users}
          title="No lead data available"
          description="Sync leads from HubSpot to see breakdown by owner, status, and source."
          action="Sync Leads"
          onAction={() => triggerSync.mutate('leads')}
        />
      </div>
    );
  }

  // Common chart props
  const commonTooltipProps = {
    contentStyle: chartConfig.tooltip.contentStyle,
    cursor: chartConfig.tooltip.cursor,
  };

  return (
    <div className={`${card.base} p-4 sm:p-6 lg:p-8 h-full`}>
      <h2 className={`${typography.cardTitle} mb-4 sm:mb-6 lg:mb-8`}>Lead Overview</h2>

      <div className="flex flex-col h-full">
        {/* Owner + Status side by side */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* By Owner */}
          <div>
            <h3 className={`${typography.tableHeader} mb-3`}>By Owner</h3>
            <div className="h-28 sm:h-32" role="img" aria-label="Leads by owner chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ownerData} layout="vertical" margin={{ right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={50}
                    tick={{ ...chartConfig.axis.tickStyle, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...commonTooltipProps} />
                  <Bar dataKey="count" radius={chartConfig.barRadius}>
                    {ownerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList dataKey="count" position="right" className="fill-gray-300" fontSize={12} fontWeight={600} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By Status */}
          <div>
            <h3 className={`${typography.tableHeader} mb-3`}>By Status</h3>
            <div className="h-28 sm:h-32" role="img" aria-label="Leads by status chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ ...chartConfig.axis.tickStyle, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...commonTooltipProps} />
                  <Bar dataKey="count" radius={chartConfig.barRadius}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList dataKey="count" position="right" className="fill-gray-300" fontSize={12} fontWeight={600} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* By Source - full width, expanded */}
        <div className="flex-1">
          <h3 className={`${typography.tableHeader} mb-3`}>By Source</h3>
          <div className={sourceData.length > 3 ? 'h-56 sm:h-64 lg:h-72' : 'h-40 sm:h-48 lg:h-56'} role="img" aria-label="Leads by source chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ right: 35 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ ...chartConfig.axis.tickStyle, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...commonTooltipProps} />
                <Bar dataKey="count" radius={chartConfig.barRadius}>
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="count" position="right" className="fill-gray-300" fontSize={13} fontWeight={600} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
