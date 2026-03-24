import { useCallback, useState } from 'react';
import apiClient from '@/services/api-client';

export function useCalendarActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCalendar = useCallback(async (payload: unknown) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.post<any>('/calendars/create/', payload);
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
      return await apiClient.put<any>(`/calendars/${calendarId}/edit/`, payload);
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
      return await apiClient.delete<any>(`/calendars/${calendarId}/delete/`);
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
        const [owned, coOwned] = await Promise.all([
          apiClient.get<any[]>('/calendars/my-calendars/'),
          apiClient.get<any[]>('/calendars/co_owned/'),
        ]);

        const mergedMap = new Map();

        [...owned, ...coOwned].forEach((calendar: any) => {
          mergedMap.set(calendar.id, calendar);
        });

        return Array.from(mergedMap.values());
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
