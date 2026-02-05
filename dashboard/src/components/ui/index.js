/**
 * UI Component Library - Barrel export
 * Import all UI components from '@/components/ui'
 */

// Core components
export { default as Button } from './Button';
export { default as Select } from './Select';
export { default as Badge, getStatusVariant, getOwnerVariant } from './Badge';

// State components
export { default as EmptyState } from './EmptyState';
export { default as ErrorState } from './ErrorState';

// Loading components
export { default as LoadingBar } from './LoadingBar';
export {
  SkeletonLine,
  SkeletonCard,
  SkeletonTable,
  SkeletonListItem,
  SkeletonChart,
  SkeletonFunnel,
  SkeletonList,
} from './LoadingSkeleton';

// Navigation components
export { default as SkipLink } from './SkipLink';

// Feedback components
export { default as Toast, ToastProvider, useToast } from './Toast';

// Performance components
export {
  default as PerformanceBadge,
  PerformanceIndicator,
  getPerformanceLevel,
  getBenchmarkText,
  thresholds,
} from './PerformanceBadge';
