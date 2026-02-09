/**
 * PerformanceBadge - Shows contextual performance indicators
 * Thresholds are calibrated for inbound sales (warm leads from HubSpot triggers)
 */
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { iconSizes } from '../../styles/designTokens';

// Performance thresholds - calibrated for inbound (warm lead) flow
// Inbound leads (triggered from HubSpot) convert at higher rates than cold outbound
export const thresholds = {
  replyRate: {
    excellent: 10, // 10%+ is excellent for inbound
    good: 5,       // 5-10% is solid
    warning: 2,    // 2-5% needs attention
    // Below 2% is critical
  },
  meetingRate: {
    excellent: 5,
    good: 3,
    warning: 1,
  },
  conversionRate: {
    excellent: 8,
    good: 4,
    warning: 2,
  },
  openRate: {
    excellent: 50,
    good: 35,
    warning: 20,
  },
};

// Performance levels with styling
const levels = {
  excellent: {
    label: 'Strong',
    icon: CheckCircle,
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  good: {
    label: 'Good',
    icon: TrendingUp,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  warning: {
    label: 'Below Avg',
    icon: TrendingDown,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  critical: {
    label: 'Low',
    icon: AlertTriangle,
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
};

/**
 * Get performance level based on value and metric type
 */
export function getPerformanceLevel(value, metricType) {
  const threshold = thresholds[metricType];
  if (!threshold) return 'good';

  if (value >= threshold.excellent) return 'excellent';
  if (value >= threshold.good) return 'good';
  if (value >= threshold.warning) return 'warning';
  return 'critical';
}

/**
 * Get benchmark text for a metric (inbound benchmarks)
 */
export function getBenchmarkText(metricType) {
  const benchmarks = {
    replyRate: 'Inbound avg: 5-10%',
    meetingRate: 'Inbound avg: 3-5%',
    conversionRate: 'Inbound avg: 4-8%',
    openRate: 'Inbound avg: 35-50%',
  };
  return benchmarks[metricType] || '';
}

export default function PerformanceBadge({
  value,
  metricType,
  showLabel = true,
  showBenchmark = false,
  size = 'md'
}) {
  const level = getPerformanceLevel(value, metricType);
  const config = levels[level];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizeMap = {
    sm: iconSizes.xs,
    md: iconSizes.sm,
    lg: iconSizes.md,
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center rounded-full font-medium border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
        title={`Performance: ${config.label}`}
      >
        <Icon className={iconSizeMap[size]} aria-hidden="true" />
        {showLabel && <span>{config.label}</span>}
      </span>
      {showBenchmark && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getBenchmarkText(metricType)}
        </span>
      )}
    </div>
  );
}

/**
 * Inline performance indicator (just icon + color)
 */
export function PerformanceIndicator({ value, metricType }) {
  const level = getPerformanceLevel(value, metricType);
  const config = levels[level];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center ${config.text}`}
      title={`${config.label} (${getBenchmarkText(metricType)})`}
      aria-label={`Performance: ${config.label}`}
    >
      <Icon className={iconSizes.sm} aria-hidden="true" />
    </span>
  );
}
