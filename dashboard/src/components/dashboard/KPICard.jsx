import { TrendingUp, TrendingDown } from 'lucide-react';
import { SkeletonCard } from '../ui';
import { typography, spacing, card, interactive, iconSizes } from '../../styles/designTokens';

/**
 * KPICard - Displays a key performance indicator with optional trend indicator
 * @param {string} title - Card title/label
 * @param {string|number} value - Main metric value
 * @param {string|number} delta - Change indicator (positive or negative)
 * @param {Component} icon - Lucide icon component
 * @param {boolean} loading - Show loading skeleton
 * @param {'primary'|'secondary'|'none'} highlight - Visual emphasis level
 */
export default function KPICard({
  title,
  value,
  delta,
  icon: Icon,
  loading = false,
  highlight = 'none',
}) {
  const isPositive = typeof delta === 'number' ? delta >= 0 : delta?.toString().startsWith('+') || !delta?.toString().startsWith('-');
  const hasChange = delta !== undefined && delta !== null && delta !== 0;

  // Loading skeleton
  if (loading) {
    return <SkeletonCard />;
  }

  // Highlight styles based on priority level
  const highlightStyles = {
    primary: {
      card: card.highlighted,
      value: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    secondary: {
      card: card.secondaryHighlight,
      value: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    none: {
      card: card.interactive,
      value: 'text-gray-900 dark:text-gray-100',
      iconBg: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-600 dark:text-gray-400',
    },
  };

  const styles = highlightStyles[highlight] || highlightStyles.none;

  return (
    <div className={`${styles.card} ${spacing.cardPadding}`}>
      {/* Header with title and icon */}
      <div className="flex items-center justify-between mb-3">
        <span className={typography.label}>{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg ${styles.iconBg}`}>
            <Icon
              className={`${iconSizes.md} ${styles.iconColor}`}
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Main value */}
      <div className={`${typography.hero} ${styles.value} mb-2`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {/* Trend indicator */}
      {hasChange && (
        <div
          className={`flex items-center gap-1 text-sm ${
            isPositive
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          } ${interactive.transition}`}
          aria-label={`${isPositive ? 'Increased' : 'Decreased'} by ${delta} compared to last period`}
        >
          {isPositive ? (
            <TrendingUp className={iconSizes.sm} aria-hidden="true" />
          ) : (
            <TrendingDown className={iconSizes.sm} aria-hidden="true" />
          )}
          <span>
            {typeof delta === 'number' && isPositive ? '+' : ''}
            {delta}
          </span>
          <span className="text-gray-500 dark:text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  );
}
