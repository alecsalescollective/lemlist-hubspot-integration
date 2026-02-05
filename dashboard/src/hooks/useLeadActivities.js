import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '../api/client';

export function useLeadActivities(owner, limit = 20) {
  return useQuery({
    queryKey: ['leads', 'activities', owner, limit],
    queryFn: () => leadsApi.getActivities(owner, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes - refresh more often for activity feed
    refetchInterval: 2 * 60 * 1000
  });
}
