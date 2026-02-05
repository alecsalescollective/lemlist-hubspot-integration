/**
 * Loading Skeleton Components - Consistent loading states across the app
 * Usage: <SkeletonCard />, <SkeletonTable rows={5} />, <SkeletonListItem />
 */

// Base skeleton line
export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }) {
  return (
    <div
      className={`${width} ${height} bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

// Skeleton for KPI cards
export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 ${className}`}
      aria-label="Loading..."
    >
      <div className="animate-pulse">
        <SkeletonLine width="w-24" className="mb-4" />
        <SkeletonLine width="w-20" height="h-10" className="mb-3" />
        <SkeletonLine width="w-16" />
      </div>
    </div>
  );
}

// Skeleton for tables
export function SkeletonTable({ rows = 3, className = '' }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} aria-label="Loading table...">
      {/* Header */}
      <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
      ))}
    </div>
  );
}

// Skeleton for activity/meeting list items
export function SkeletonListItem({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 py-3 animate-pulse ${className}`} aria-hidden="true">
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <SkeletonLine width="w-32" className="mb-2" />
        <SkeletonLine width="w-24" height="h-3" />
      </div>
      <SkeletonLine width="w-16" height="h-3" />
    </div>
  );
}

// Skeleton for charts
export function SkeletonChart({ height = 'h-48', className = '' }) {
  return (
    <div
      className={`${height} bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ${className}`}
      aria-label="Loading chart..."
    />
  );
}

// Skeleton for funnel stages
export function SkeletonFunnel({ stages = 3, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-4 animate-pulse ${className}`} aria-label="Loading funnel...">
      {Array.from({ length: stages }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div className="w-44 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          {i < stages - 1 && (
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded mx-4" />
          )}
        </div>
      ))}
    </div>
  );
}

// Wrapper for multiple skeleton items in a list
export function SkeletonList({ count = 5, className = '' }) {
  return (
    <div className={`space-y-0 ${className}`} aria-label="Loading list...">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}
