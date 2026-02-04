import { useQuery } from '@tanstack/react-query';
import { meetingsApi } from '../api/client';

export function useMeetings(owner, date = 'all') {
  return useQuery({
    queryKey: ['meetings', owner, date],
    queryFn: () => meetingsApi.getAll(owner, date),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  });
}

export function useMeetingStats(owner, period = '30d') {
  return useQuery({
    queryKey: ['meetings', 'stats', owner, period],
    queryFn: () => meetingsApi.getStats(owner, period),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  });
}
