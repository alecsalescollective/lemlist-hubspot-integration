/**
 * ErrorState - Reusable error state component with icon, message, and retry button
 * Usage: <ErrorState title="Error loading data" message={error.message} onRetry={refetch} />
 */
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) {
  return (
    <div
      className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle
            className="w-5 h-5 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-red-800 dark:text-red-200">{title}</p>
          {message && (
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{message}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 transition-colors duration-150 focus:outline-none focus:underline"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
