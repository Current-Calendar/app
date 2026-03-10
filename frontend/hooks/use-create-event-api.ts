import { useCallback, useState } from 'react';
import { useCalendarActions } from '@/hooks/use-calendar-actions';
import apiClient from '@/services/api-client';

export function useCreateEventApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getMyCalendars } = useCalendarActions();

  const loadMyCalendars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await getMyCalendars();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getMyCalendars]);

  const createEvent = useCallback(async (payload: unknown) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.post<any>('/eventos', payload);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    loadMyCalendars,
    createEvent,
  };
}
