import { useState } from 'react';
import apiClient from '@/services/api-client';

type EventPayload = Record<string, unknown>;

const toBackendEventPayload = (payload: EventPayload): EventPayload => {
  const normalized: EventPayload = { ...payload };

  if (normalized.latitude != null || normalized.longitude != null) {
    normalized.latitud = normalized.latitude;
    normalized.longitud = normalized.longitude;
    delete normalized.latitude;
    delete normalized.longitude;
  }

  return normalized;
};

export function useEditEventApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCalendars = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>('/calendars/list/');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.calendars)
          ? data.calendars
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
      return await apiClient.get<any>(`/events/${eventId}/edit/`);
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
      const normalizedPayload = toBackendEventPayload((payload ?? {}) as EventPayload);
      return await apiClient.put<any>(`/events/${eventId}/edit/`, normalizedPayload);
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
