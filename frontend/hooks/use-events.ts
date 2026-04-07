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

  const fetchEvents = useCallback(async (ids?: string) => {
    if (ids !== undefined && ids === '') {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = ids 
        ? `/events/list?calendarIds=${ids}`
        : '/events/list';
      const data = await apiClient.get<any[]>(url);
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
