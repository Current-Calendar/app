import { useState } from 'react';
import apiClient from '@/services/api-client';

export function useEventActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteEvent = async (eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/eventos/${eventId}/delete/`);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getEventById = async (eventId: string) => {
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

  const updateEventById = async (eventId: string, payload: unknown) => {
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
    deleteEvent,
    getEventById,
    updateEventById,
  };
}
