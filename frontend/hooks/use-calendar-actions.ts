import { useCallback, useState } from 'react';
import apiClient from '@/services/api-client';

export function useCalendarActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCalendar = useCallback(async (payload: unknown) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.post<any>('/calendarios', payload);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCalendar = useCallback(async (calendarId: number, payload: unknown) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.put<any>(`/calendarios/${calendarId}/editar/`, payload);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCalendar = useCallback(async (calendarId: string | number) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.delete<any>(`/calendarios/${calendarId}/eliminar/`);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyCalendars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.get<any>('/calendarios/mis-calendarios');
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
    createCalendar,
    updateCalendar,
    deleteCalendar,
    getMyCalendars,
  };
}
