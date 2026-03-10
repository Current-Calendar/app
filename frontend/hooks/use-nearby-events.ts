import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/services/api-client';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface UseNearbyEventsOptions {
  radiusKm?: number;
  enabled?: boolean;
}

export function useNearbyEvents(
  coords: Coordinates | null,
  options: UseNearbyEventsOptions = {},
) {
  const { radiusKm = 5, enabled = true } = options;

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNearby = useCallback(async () => {
    if (!coords || !enabled) return;

    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any[]>(
        `/radar?lat=${coords.latitude}&lon=${coords.longitude}&radio=${radiusKm}`,
      );
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching nearby events:', err);
      setEvents([]);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [coords, radiusKm, enabled]);

  useEffect(() => {
    void fetchNearby();
  }, [fetchNearby]);

  return {
    events,
    loading,
    error,
    refetch: fetchNearby,
  };
}
