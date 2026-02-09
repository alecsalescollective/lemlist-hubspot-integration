import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight, ArrowDown, Activity, Lock } from 'lucide-react';
import { useFunnelStats } from '../../hooks/useFunnel';
import { useTriggerSync } from '../../hooks/useSync';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonFunnel, PerformanceBadge } from '../ui';
import {
  typography,
  card,
  chartConfig,
  interactive,
  iconSizes,
} from '../../styles/designTokens';

export default function FunnelChart() {
  const { owner, dateRange } = useFilters();
  const { data, isLoading, error, refetch } = useFunnelStats(owner, dateRange);
  const triggerSync = useTriggerSync();

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8`}>
        <h2 className={`${typography.pageTitle} mb-4 sm:mb-6`}>Sales Funnel</h2>
        <SkeletonFunnel stages={6} />
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8`}>
        <h2 className={`${typography.pageTitle} mb-4`}>Sales Funnel</h2>
        <ErrorState
          title="Error loading funnel data"
          message={error.message}
          onRetry={refetch}
        />
      </div>
    );
  }

  const stages = data?.stages || [];
  const conversions = data?.conversions || {};
  const trend = data?.trend?.leadToMeeting || 0;

  // Empty state with action
  if (stages.length === 0) {
    return (
      <div className={`${card.base} p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8`}>
        <h2 className={`${typography.pageTitle} mb-4`}>Sales Funnel</h2>
        <EmptyState
          icon={Activity}
          title="No funnel data available"
          description="Sync your leads from HubSpot to see your sales funnel visualization and conversion rates."
          action="Sync Leads"
          onAction={() => triggerSync.mutate('leads')}
        />
      </div>
    );
  }

  // Prepare data for the horizontal bar chart (exclude Salesforce placeholders with 0 count)
  const activeStages = stages.filter(s => !s.salesforce || s.count > 0);
  const maxCount = Math.max(...activeStages.map((s) => s.count), 1);
  const chartData = activeStages.map((stage) => ({
    ...stage,
    percentage: Math.round((stage.count / maxCount) * 100),
  }));

  const leadToMeetingRate = conversions.leadToMeeting || 0;

  // Map conversion rates between adjacent stages
  const conversionBetween = (index) => {
    const stage = stages[index];
    const nextStage = stages[index + 1];
    if (!stage || !nextStage) return null;

    const pairs = {
      'Total Leads→In Sequence': conversions.leadToSequence,
      'In Sequence→Sequence Finished': conversions.sequenceFinished,
      'Sequence Finished→Meeting Booked': conversions.sequenceToMeeting,
      'Meeting Booked→Meeting Held': conversions.meetingToHeld,
      'Meeting Held→Qualified': conversions.heldToQualified,
    };

    const key = `${stage.name}→${nextStage.name}`;
    return pairs[key];
  };

  return (
    <div className={`${card.base} p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8`}>
      {/* Header with title and conversion rate */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
        <h2 className={typography.pageTitle}>Sales Funnel</h2>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className={`${typography.label} hidden sm:inline`}>Lead to Meeting:</span>
          <span className="font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100">
            {leadToMeetingRate}%
          </span>
          <PerformanceBadge
            value={leadToMeetingRate}
            metricType="conversionRate"
            size="sm"
            showLabel
          />
          {trend !== 0 && (
            <span
              className={`flex items-center text-sm ${
                trend > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              } ${interactive.transition}`}
              aria-label={`${trend > 0 ? 'Up' : 'Down'} ${Math.abs(trend)}% from last period`}
            >
              {trend > 0 ? (
                <TrendingUp className={iconSizes.sm} aria-hidden="true" />
              ) : (
                <TrendingDown className={iconSizes.sm} aria-hidden="true" />
              )}
              {trend > 0 ? '+' : ''}
              {trend}%
            </span>
          )}
        </div>
      </div>

      {/* Funnel Visualization - Desktop */}
      <div
        className="hidden md:flex items-center justify-center gap-2 lg:gap-3 mb-6 lg:mb-8 overflow-x-auto"
        role="img"
        aria-label={`Sales funnel showing ${stages.map((s) => `${s.name}: ${s.count}`).join(', ')}`}
      >
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex items-center flex-shrink-0">
            {/* Stage Box */}
            <div className="text-center">
              <div
                className={`rounded-lg px-4 lg:px-5 py-3 lg:py-4 min-w-[120px] lg:min-w-[140px] ${interactive.transition} ${
                  stage.salesforce ? 'opacity-50' : ''
                }`}
                style={{
                  backgroundColor: `${stage.color}15`,
                  borderLeft: `4px solid ${stage.color}`,
                }}
              >
                <div
                  className="text-xl lg:text-2xl font-bold flex items-center justify-center gap-1"
                  style={{ color: stage.color }}
                >
                  {stage.salesforce && stage.count === 0 && (
                    <Lock className="w-3.5 h-3.5 opacity-50" aria-hidden="true" />
                  )}
                  {stage.count.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
                  {stage.name}
                </div>
                {stage.salesforce && stage.count === 0 && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Salesforce</div>
                )}
              </div>
            </div>

            {/* Arrow with conversion rate */}
            {index < stages.length - 1 && (
              <div className="flex flex-col items-center mx-1 lg:mx-2">
                <ArrowRight
                  className={`${iconSizes.md} text-gray-400 dark:text-gray-500`}
                  aria-hidden="true"
                />
                {conversionBetween(index) != null && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {conversionBetween(index)}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Funnel Visualization - Mobile (stacked) */}
      <div
        className="flex md:hidden flex-col items-center gap-2 mb-6"
        role="img"
        aria-label={`Sales funnel showing ${stages.map((s) => `${s.name}: ${s.count}`).join(', ')}`}
      >
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex flex-col items-center w-full">
            {/* Stage Box */}
            <div
              className={`rounded-lg px-4 py-3 w-full ${interactive.transition} ${
                stage.salesforce ? 'opacity-50' : ''
              }`}
              style={{
                backgroundColor: `${stage.color}15`,
                borderLeft: `4px solid ${stage.color}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                  {stage.name}
                  {stage.salesforce && stage.count === 0 && (
                    <Lock className="w-3 h-3 opacity-50" aria-hidden="true" />
                  )}
                </div>
                <div
                  className="text-xl font-bold"
                  style={{ color: stage.color }}
                >
                  {stage.count.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Arrow with conversion rate */}
            {index < stages.length - 1 && (
              <div className="flex items-center gap-2 my-1">
                <ArrowDown
                  className={`${iconSizes.sm} text-gray-400 dark:text-gray-500`}
                  aria-hidden="true"
                />
                {conversionBetween(index) != null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {conversionBetween(index)}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bar Chart Representation - hidden on mobile, uses active stages only */}
      <div className="hidden sm:block h-16 lg:h-20 mt-4 lg:mt-6" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" barGap={0}>
            <XAxis type="number" hide domain={[0, maxCount]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(value) => [value.toLocaleString(), 'Count']}
              contentStyle={chartConfig.tooltip.contentStyle}
              cursor={chartConfig.tooltip.cursor}
            />
            <Bar dataKey="count" radius={chartConfig.barRadius} barSize={16}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList
                dataKey="name"
                position="insideLeft"
                fill="#fff"
                fontSize={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <span className="hidden sm:inline">Lead to Sequence</span>
            <span className="sm:hidden">Lead→Seq</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 sm:mt-2">
            {conversions.leadToSequence || 0}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <span className="hidden sm:inline">Sequence to Meeting</span>
            <span className="sm:hidden">Seq→Mtg</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 sm:mt-2">
            {conversions.sequenceToMeeting || 0}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <span className="hidden sm:inline">Overall Conversion</span>
            <span className="sm:hidden">Overall</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-1 sm:mt-2">
            {conversions.leadToMeeting || 0}%
          </div>
        </div>
      </div>
    </div>
  );
}
