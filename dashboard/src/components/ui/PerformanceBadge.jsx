/**
 * PerformanceBadge - Shows contextual performance indicators
 * Displays "Strong", "Good", "At Risk", "Critical" based on thresholds
 */
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { iconSizes } from '../../styles/designTokens';

// Performance thresholds for different metrics
export const thresholds = {
  replyRate: {
    excellent: 15,  // 15%+ is excellent
    good: 10,       // 10-15% is good
    warning: 5,     // 5-10% needs attention
    // Below 5% is critical
  },
  meetingRate: {
    excellent: 8,
    good: 5,
    warning: 2,
  },
  conversionRate: {
    excellent: 12,
    good: 8,
    warning: 4,
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
    label: 'Excellent',
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
    label: 'At Risk',
    icon: Minus,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  critical: {
    label: 'Critical',
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
 * Get benchmark text for a metric
 */
export function getBenchmarkText(metricType) {
  const benchmarks = {
    replyRate: 'Industry avg: 8-12%',
    meetingRate: 'Industry avg: 4-6%',
    conversionRate: 'Industry avg: 6-10%',
    openRate: 'Industry avg: 30-40%',
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
      title={`Performance: ${config.label}`}
      aria-label={`Performance level: ${config.label}`}
    >
      <Icon className={iconSizes.sm} aria-hidden="true" />
    </span>
  );
}
