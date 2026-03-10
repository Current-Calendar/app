import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/services/api-client';

interface UseCalendarsOptions {
  autoFetch?: boolean;
}

export function useCalendars(options: UseCalendarsOptions = {}) {
  const { autoFetch = true } = options;

  const [calendars, setCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any[]>('/calendarios/list');
      setCalendars(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setCalendars([]);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetchCalendars();
    }
  }, [autoFetch, fetchCalendars]);

  return {
    calendars,
    loading,
    error,
    refetch: fetchCalendars,
  };
}
