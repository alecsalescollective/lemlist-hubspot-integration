import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { syncApi } from '../api/client';

const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync', 'status'],
    queryFn: () => syncApi.getStatus(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // Refresh every minute
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type) => syncApi.trigger(type),
    onSuccess: () => {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
    }
  });
}

/**
 * Auto-sync hook - triggers sync on mount and every 15 minutes
 */
export function useAutoSync() {
  const triggerSync = useTriggerSync();
  const hasInitialSynced = useRef(false);

  useEffect(() => {
    // Sync on initial mount (page load/refresh)
    if (!hasInitialSynced.current) {
      hasInitialSynced.current = true;
      triggerSync.mutate('all');
    }

    // Set up interval for auto-sync every 15 minutes
    const interval = setInterval(() => {
      triggerSync.mutate('all');
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return triggerSync;
}
