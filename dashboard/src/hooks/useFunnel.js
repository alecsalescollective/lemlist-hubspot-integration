import { useQuery } from '@tanstack/react-query';
import { funnelApi } from '../api/client';

export function useFunnelStats(owner, period = '30d') {
  return useQuery({
    queryKey: ['funnel', 'stats', owner, period],
    queryFn: () => funnelApi.getStats(owner, period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000
  });
}
