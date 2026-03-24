import { useCallback, useState } from 'react';
import { useCalendarActions } from '@/hooks/use-calendar-actions';
import apiClient from '@/services/api-client';

type EventPayload = Record<string, unknown>;

const toBackendEventPayload = (payload: EventPayload | FormData): EventPayload | FormData => {
  if (payload instanceof FormData) {
    return payload;
  }
  const normalized: EventPayload = { ...payload };

  if (normalized.latitude != null || normalized.longitude != null) {
    normalized.latitud = normalized.latitude;
    normalized.longitud = normalized.longitude;
    delete normalized.latitude;
    delete normalized.longitude;
  }

  return normalized;
};

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
      const normalizedPayload = toBackendEventPayload((payload ?? {}) as EventPayload);
      return await apiClient.post<any>('/events/create/', normalizedPayload);
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
