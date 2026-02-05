import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from 'lucide-react';
import { useLeadsSummary } from '../../hooks/useLeads';
import { useTriggerSync } from '../../hooks/useSync';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonChart } from '../ui';
import {
  typography,
  spacing,
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
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-6`}>Lead Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonChart height="h-48" />
          <SkeletonChart height="h-48" />
          <SkeletonChart height="h-48" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
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

  const sourceData =
    data?.bySource?.map((s) => ({
      name:
        s.source?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) ||
        'Unknown',
      count: s.count,
    })) || [];

  const hasData = ownerData.length > 0 || statusData.length > 0 || sourceData.length > 0;

  // Empty state
  if (!hasData) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
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
    <div className={`${card.base} ${spacing.cardPadding}`}>
      <h2 className={`${typography.cardTitle} mb-8`}>Lead Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* By Owner */}
        <div>
          <h3 className={`${typography.tableHeader} mb-4`}>By Owner</h3>
          <div className="h-48" role="img" aria-label="Leads by owner chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={60}
                  tick={chartConfig.axis.tickStyle}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...commonTooltipProps} />
                <Bar dataKey="count" radius={chartConfig.barRadius}>
                  {ownerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Status */}
        <div>
          <h3 className={`${typography.tableHeader} mb-4`}>By Status</h3>
          <div className="h-48" role="img" aria-label="Leads by status chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={chartConfig.axis.tickStyle}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...commonTooltipProps} />
                <Bar dataKey="count" radius={chartConfig.barRadius}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Source */}
        <div>
          <h3 className={`${typography.tableHeader} mb-4`}>By Source</h3>
          <div className="h-48" role="img" aria-label="Leads by source chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={chartConfig.axis.tickStyle}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...commonTooltipProps} />
                <Bar
                  dataKey="count"
                  fill={colors.primary}
                  radius={chartConfig.barRadius}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
