import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../api/client';

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
