import { useState } from 'react';
import apiClient from '@/services/api-client';

export function useEditEventApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCalendars = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>('/calendarios/list');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.calendarios)
          ? data.calendarios
          : [];
      return list;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadEvent = async (eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.get<any>(`/eventos/${eventId}`);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (eventId: string, payload: unknown) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.put<any>(`/eventos/${eventId}`, payload);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    loadCalendars,
    loadEvent,
    updateEvent,
  };
}
