import { TrendingUp, TrendingDown, ArrowRight, ArrowDown, Activity } from 'lucide-react';
import { useFunnelStats } from '../../hooks/useFunnel';
import { useTriggerSync } from '../../hooks/useSync';
import { useFilters } from '../../context/FilterContext';
import { EmptyState, ErrorState, SkeletonFunnel, PerformanceBadge } from '../ui';
import {
  typography,
  card,
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
  const sequenceFinished = data?.sequenceFinished || 0;

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

  const leadToMeetingRate = conversions.leadToMeeting || 0;

  // Map conversion rates between adjacent stages
  const conversionBetween = (index) => {
    const stage = stages[index];
    const nextStage = stages[index + 1];
    if (!stage || !nextStage) return null;

    const pairs = {
      'Total Leads→In Sequence': conversions.leadToSequence,
      'In Sequence→Meeting Booked': conversions.sequenceToMeeting,
      'Meeting Booked→Meeting Held': conversions.meetingToHeld,
      'Meeting Held→Qualified': conversions.heldToQualified,
    };

    const key = `${stage.name}→${nextStage.name}`;
    return pairs[key];
  };

  return (
    <div className={`${card.base} p-5 sm:p-8 lg:p-10 mb-6 sm:mb-8`}>
      {/* Header with title and conversion rate */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-8 sm:mb-10">
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
        className="hidden md:flex items-center justify-center gap-3 lg:gap-4"
        role="img"
        aria-label={`Sales funnel showing ${stages.map((s) => `${s.name}: ${s.count}`).join(', ')}`}
      >
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex items-center flex-shrink-0">
            {/* Stage Box */}
            <div className="text-center">
              <div
                className={`rounded-xl px-7 lg:px-10 py-6 lg:py-8 min-w-[160px] lg:min-w-[190px] ${interactive.transition}`}
                style={{
                  backgroundColor: `${stage.color}15`,
                  borderLeft: `4px solid ${stage.color}`,
                }}
              >
                <div
                  className="text-4xl lg:text-5xl font-bold flex items-center justify-center gap-1"
                  style={{ color: stage.color }}
                >
                  {stage.count.toLocaleString()}
                </div>
                <div className="text-base lg:text-lg text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  {stage.name}
                </div>
              </div>
            </div>

            {/* Arrow with conversion rate */}
            {index < stages.length - 1 && (
              <div className="flex flex-col items-center mx-3 lg:mx-4">
                <ArrowRight
                  className="w-6 h-6 text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                />
                {conversionBetween(index) != null && (
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
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
        className="flex md:hidden flex-col items-center gap-2"
        role="img"
        aria-label={`Sales funnel showing ${stages.map((s) => `${s.name}: ${s.count}`).join(', ')}`}
      >
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex flex-col items-center w-full">
            {/* Stage Box */}
            <div
              className={`rounded-xl px-5 py-4 w-full ${interactive.transition}`}
              style={{
                backgroundColor: `${stage.color}15`,
                borderLeft: `4px solid ${stage.color}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-base text-gray-600 dark:text-gray-400 font-medium">
                  {stage.name}
                </div>
                <div
                  className="text-2xl font-bold"
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
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {conversionBetween(index)}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
