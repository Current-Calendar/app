import { useQuery } from '@tanstack/react-query';

export function useAdsConfig() {
  return useQuery({
    queryKey: ['ads-config'],
    queryFn: async () => {
      const res = await fetch('/api/ads/config');
      return res.json();
    },
    staleTime: 1000 * 60 * 10, // refresca cada 10 minutos
  });
}