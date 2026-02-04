import { RefreshCw, BarChart3 } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';
import { useSyncStatus, useTriggerSync } from '../../hooks/useSync';
import { formatDistanceToNow } from 'date-fns';

const owners = [
  { value: 'all', label: 'All Owners' },
  { value: 'alec', label: 'Alec' },
  { value: 'janae', label: 'Janae' },
  { value: 'kate', label: 'Kate' }
];

const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' }
];

export default function Header() {
  const { owner, setOwner, dateRange, setDateRange } = useFilters();
  const { data: syncStatus } = useSyncStatus();
  const triggerSync = useTriggerSync();

  // Find latest sync time
  const latestSync = syncStatus?.syncs?.reduce((latest, sync) => {
    if (!sync.lastSyncAt) return latest;
    if (!latest) return sync.lastSyncAt;
    return new Date(sync.lastSyncAt) > new Date(latest) ? sync.lastSyncAt : latest;
  }, null);

  const handleRefresh = () => {
    triggerSync.mutate('all');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-900">Lead Dashboard</h1>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Owner Filter */}
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {owners.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {dateRanges.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>

          {/* Sync Status & Refresh */}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {latestSync && (
              <span>
                Synced {formatDistanceToNow(new Date(latestSync), { addSuffix: true })}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={triggerSync.isPending}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
