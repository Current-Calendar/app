import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api-client';

export function useAdsConfig() {
  return useQuery({
    queryKey: ['ads-config'],
    queryFn: () => apiClient.get<{
      show_ads: boolean;
      frequency: number;
      placements: string[];
    }>('/ads/config/'),
    staleTime: 1000 * 60 * 10,
  });
}