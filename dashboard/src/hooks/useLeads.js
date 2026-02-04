import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '../api/client';

export function useLeadsSummary(owner, period = '7d') {
  return useQuery({
    queryKey: ['leads', 'summary', owner, period],
    queryFn: () => leadsApi.getSummary(owner, period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000
  });
}

export function useLeads(owner, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['leads', owner, limit, offset],
    queryFn: () => leadsApi.getLeads(owner, limit, offset),
    staleTime: 5 * 60 * 1000
  });
}
