import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/services/api-client';

interface UseEventsOptions {
  autoFetch?: boolean;
}

export function useEventsList(options: UseEventsOptions = {}) {
  const { autoFetch = true } = options;

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any[]>('/events/list');
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setEvents([]);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetchEvents();
    }
  }, [autoFetch, fetchEvents]);

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  };
}
