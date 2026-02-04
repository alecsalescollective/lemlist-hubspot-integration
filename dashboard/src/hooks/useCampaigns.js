import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '../api/client';

export function useCampaigns(owner) {
  return useQuery({
    queryKey: ['campaigns', owner],
    queryFn: () => campaignsApi.getAll(owner),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  });
}

export function useCampaign(id) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  });
}
