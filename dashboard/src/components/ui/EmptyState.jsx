/**
 * EmptyState - Reusable empty state component with icon, title, description, and optional CTA
 * Usage: <EmptyState icon={TrendingUp} title="No data" description="Sync to see data" action="Sync Now" onAction={handleSync} />
 */

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  className = '',
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-gray-400 dark:text-gray-500" aria-hidden="true" />
        </div>
      )}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          {action}
        </button>
      )}
    </div>
  );
}
