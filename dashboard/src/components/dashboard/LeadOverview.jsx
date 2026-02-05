import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLeadsSummary } from '../../hooks/useLeads';
import { useFilters } from '../../context/FilterContext';
import {
  typography,
  spacing,
  card,
  chartConfig,
  ownerColors,
  statusColors,
  colors,
  getOwnerColors
} from '../../styles/designTokens';

export default function LeadOverview() {
  const { owner, dateRange } = useFilters();
  const { data, isLoading } = useLeadsSummary(owner, dateRange);

  if (isLoading) {
    return (
      <div className={`${card.base} ${spacing.cardPadding}`}>
        <h2 className={`${typography.cardTitle} mb-4`}>Lead Overview</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const ownerData = data?.byOwner?.map(o => ({
    name: o.owner?.charAt(0).toUpperCase() + o.owner?.slice(1) || 'Unknown',
    count: o.count,
    color: getOwnerColors(o.owner).bar
  })) || [];

  const statusData = Object.entries(data?.byStatus || {}).map(([status, count]) => ({
    name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count,
    color: statusColors[status]?.bar || statusColors.draft.bar || '#6B7280'
  }));

  const sourceData = data?.bySource?.map(s => ({
    name: s.source?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
    count: s.count
  })) || [];

  return (
    <div className={`${card.base} ${spacing.cardPadding}`}>
      <h2 className={`${typography.cardTitle} mb-8`}>Lead Overview</h2>

      <div className={`grid grid-cols-1 lg:grid-cols-3 ${spacing.cardGap}`}>
        {/* By Owner */}
        <div>
          <h3 className={`${typography.tableHeader} mb-4`}>By Owner</h3>
          <div className="h-48">
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
                <Tooltip
                  contentStyle={chartConfig.tooltip.contentStyle}
                  cursor={chartConfig.tooltip.cursor}
                />
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
          <div className="h-48">
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
                <Tooltip
                  contentStyle={chartConfig.tooltip.contentStyle}
                  cursor={chartConfig.tooltip.cursor}
                />
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
          <div className="h-48">
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
                <Tooltip
                  contentStyle={chartConfig.tooltip.contentStyle}
                  cursor={chartConfig.tooltip.cursor}
                />
                <Bar dataKey="count" fill={colors.primary} radius={chartConfig.barRadius} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
