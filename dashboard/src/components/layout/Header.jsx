import { RefreshCw, BarChart3, Sun, Moon, X } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';
import { useTheme } from '../../context/ThemeContext';
import { useSyncStatus, useTriggerSync } from '../../hooks/useSync';
import { formatDistanceToNow } from 'date-fns';
import { Select, Button } from '../ui';
import { typography, layout, iconSizes, a11y } from '../../styles/designTokens';

const owners = [
  { value: 'all', label: 'All Owners' },
  { value: 'alec', label: 'Alec' },
  { value: 'janae', label: 'Janae' },
  { value: 'kate', label: 'Kate' },
];

const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' },
];

const DEFAULT_OWNER = 'all';
const DEFAULT_DATE_RANGE = '7d';

export default function Header() {
  const { owner, setOwner, dateRange, setDateRange } = useFilters();
  const { isDark, toggleTheme } = useTheme();
  const { data: syncStatus } = useSyncStatus();
  const triggerSync = useTriggerSync();

  // Find latest sync time
  const latestSync = syncStatus?.syncs?.reduce((latest, sync) => {
    if (!sync.lastSyncAt) return latest;
    if (!latest) return sync.lastSyncAt;
    return new Date(sync.lastSyncAt) > new Date(latest) ? sync.lastSyncAt : latest;
  }, null);

  // Check if filters are active (non-default)
  const hasActiveFilters = owner !== DEFAULT_OWNER || dateRange !== DEFAULT_DATE_RANGE;

  const handleRefresh = () => {
    triggerSync.mutate('all');
  };

  const resetFilters = () => {
    setOwner(DEFAULT_OWNER);
    setDateRange(DEFAULT_DATE_RANGE);
  };

  return (
    <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${layout.headerPadding} transition-colors duration-200`}>
      <div className="flex items-center justify-between">
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <BarChart3
            className={`${iconSizes.lg} text-blue-500`}
            aria-hidden="true"
          />
          <h1 className={typography.pageTitle}>Lead Dashboard</h1>
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center gap-4">
          {/* Owner Filter */}
          <Select
            id="owner-filter"
            label="Filter by owner"
            srOnlyLabel
            value={owner}
            onChange={setOwner}
            options={owners}
          />

          {/* Date Range Filter */}
          <Select
            id="date-range-filter"
            label="Filter by date range"
            srOnlyLabel
            value={dateRange}
            onChange={setDateRange}
            options={dateRanges}
          />

          {/* Reset Filters Button - shows when filters are active */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Reset filters to default"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />

          {/* Sync Status & Refresh */}
          <div className="flex items-center gap-3">
            {latestSync && (
              <span className={`${typography.label} hidden md:inline`}>
                Synced {formatDistanceToNow(new Date(latestSync), { addSuffix: true })}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={triggerSync.isPending}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={triggerSync.isPending ? 'Syncing data...' : 'Refresh data'}
            >
              <RefreshCw
                className={`${iconSizes.md} ${triggerSync.isPending ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {triggerSync.isPending && (
                <span className={a11y.srOnly}>Syncing data...</span>
              )}
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className={iconSizes.md} aria-hidden="true" />
            ) : (
              <Moon className={iconSizes.md} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
