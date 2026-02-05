import { TrendingUp, TrendingDown } from 'lucide-react';
import { typography, spacing, card, interactive, iconSizes } from '../../styles/designTokens';

export default function KPICard({ title, value, delta, icon: Icon, loading = false, highlighted = false }) {
  const isPositive = delta >= 0;

  if (loading) {
    return (
      <div className={`${card.base} ${spacing.cardPadding} animate-pulse`}>
        <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-20 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
    );
  }

  return (
    <div className={`${highlighted ? card.highlighted : card.interactive} ${spacing.cardPadding}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={typography.label}>{title}</span>
        {Icon && <Icon className={`${iconSizes.md} text-gray-400`} />}
      </div>
      <div className={`${typography.hero} mb-2`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {delta !== undefined && delta !== null && (
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'} ${interactive.transition}`}>
          {isPositive ? (
            <TrendingUp className={iconSizes.sm} />
          ) : (
            <TrendingDown className={iconSizes.sm} />
          )}
          <span>{isPositive ? '+' : ''}{delta}</span>
          <span className="text-gray-500">vs last period</span>
        </div>
      )}
    </div>
  );
}
