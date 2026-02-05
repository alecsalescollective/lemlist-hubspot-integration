import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight, ArrowDown } from 'lucide-react';
import { useFunnelStats } from '../../hooks/useFunnel';
import { useFilters } from '../../context/FilterContext';
import { typography, spacing, card, chartConfig, interactive, iconSizes, funnelColors } from '../../styles/designTokens';

export default function FunnelChart() {
  const { owner, dateRange } = useFilters();
  const { data, isLoading, error } = useFunnelStats(owner, dateRange);

  if (isLoading) {
    return (
      <div className={`${card.base} ${spacing.cardPadding} mb-8`}>
        <h2 className={`${typography.pageTitle} mb-4`}>Sales Funnel</h2>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${card.base} ${spacing.cardPadding} mb-8`}>
        <h2 className={`${typography.pageTitle} mb-4`}>Sales Funnel</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-sm font-medium text-red-800">Error loading funnel data</p>
          <p className="text-sm text-red-600 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  const stages = data?.stages || [];
  const conversions = data?.conversions || {};
  const trend = data?.trend?.leadToMeeting || 0;

  // If no stages, show empty state
  if (stages.length === 0) {
    return (
      <div className={`${card.base} ${spacing.cardPadding} mb-8`}>
        <h2 className={`${typography.pageTitle} mb-4`}>Sales Funnel</h2>
        <div className="text-center py-8">
          <p className="font-medium text-gray-900">No funnel data available</p>
          <p className={`${typography.label} mt-2`}>Sync leads to see your funnel</p>
        </div>
      </div>
    );
  }

  // Prepare data for the horizontal bar chart
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const chartData = stages.map(stage => ({
    ...stage,
    percentage: Math.round((stage.count / maxCount) * 100)
  }));

  return (
    <div className={`${card.base} ${spacing.cardPadding} mb-8`}>
      <div className="flex items-center justify-between mb-8">
        <h2 className={typography.pageTitle}>Sales Funnel</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className={typography.label}>Lead to Meeting:</span>
          <span className="font-bold text-xl text-gray-900">{conversions.leadToMeeting || 0}%</span>
          {trend !== 0 && (
            <span className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'} ${interactive.transition}`}>
              {trend > 0 ? <TrendingUp className={iconSizes.sm} /> : <TrendingDown className={iconSizes.sm} />}
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>

      {/* Funnel Visualization - Desktop */}
      <div className="hidden md:flex items-center justify-center gap-4 mb-8">
        {chartData.map((stage, index) => (
          <div key={stage.name} className="flex items-center">
            {/* Stage Box */}
            <div className="text-center">
              <div
                className={`rounded-lg px-8 py-5 min-w-[180px] ${interactive.transition}`}
                style={{ backgroundColor: `${stage.color}15`, borderLeft: `4px solid ${stage.color}` }}
              >
                <div className="text-3xl font-bold" style={{ color: stage.color }}>
                  {stage.count.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mt-1 font-medium">{stage.name}</div>
              </div>
            </div>

            {/* Arrow with conversion rate */}
            {index < chartData.length - 1 && (
              <div className="flex flex-col items-center mx-4">
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <span className={`${typography.small} mt-1`}>
                  {index === 0 ? conversions.leadToSequence : conversions.sequenceToMeeting}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Funnel Visualization - Mobile (stacked) */}
      <div className="flex md:hidden flex-col items-center gap-3 mb-8">
        {chartData.map((stage, index) => (
          <div key={stage.name} className="flex flex-col items-center w-full">
            {/* Stage Box */}
            <div
              className={`rounded-lg px-6 py-4 w-full max-w-xs ${interactive.transition}`}
              style={{ backgroundColor: `${stage.color}15`, borderLeft: `4px solid ${stage.color}` }}
            >
              <div className="text-2xl font-bold" style={{ color: stage.color }}>
                {stage.count.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1 font-medium">{stage.name}</div>
            </div>

            {/* Arrow with conversion rate */}
            {index < chartData.length - 1 && (
              <div className="flex items-center gap-2 my-2">
                <ArrowDown className={`${iconSizes.md} text-gray-400`} />
                <span className={typography.small}>
                  {index === 0 ? conversions.leadToSequence : conversions.sequenceToMeeting}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bar Chart Representation */}
      <div className="h-20 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" barGap={0}>
            <XAxis type="number" hide domain={[0, maxCount]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(value) => [value.toLocaleString(), 'Count']}
              contentStyle={chartConfig.tooltip.contentStyle}
              cursor={chartConfig.tooltip.cursor}
            />
            <Bar dataKey="count" radius={chartConfig.barRadius} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList dataKey="name" position="insideLeft" fill="#fff" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion Summary */}
      <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-100">
        <div className="text-center">
          <div className={typography.tableHeader}>Lead to Sequence</div>
          <div className={`${typography.cardMetric} mt-2`}>{conversions.leadToSequence || 0}%</div>
        </div>
        <div className="text-center">
          <div className={typography.tableHeader}>Sequence to Meeting</div>
          <div className={`${typography.cardMetric} mt-2`}>{conversions.sequenceToMeeting || 0}%</div>
        </div>
        <div className="text-center">
          <div className={typography.tableHeader}>Overall Conversion</div>
          <div className={`${typography.cardMetric} text-green-600 mt-2`}>{conversions.leadToMeeting || 0}%</div>
        </div>
      </div>
    </div>
  );
}
