import { useEffect, useState } from 'react';
import apiClient from '@/services/api-client';

interface UseSearchOptions {
  delayMs?: number;
}

async function loadCalendarCategories(calendarId: string | number) {
  try {
    const response = await apiClient.get<any>(`/categories/for-calendar/${calendarId}/`);

    return (
      (Array.isArray(response) && response) ||
      (Array.isArray(response?.results) && response.results) ||
      (Array.isArray(response?.data) && response.data) ||
      []
    );
  } catch (error) {
    console.error(`Error loading categories for calendar ${calendarId}:`, error);
    return [];
  }
}

async function loadEventTags(eventId: string | number) {
  try {
    const response = await apiClient.get<any>(`/event-tags/for-event/${eventId}/`);

    return (
      (Array.isArray(response) && response) ||
      (Array.isArray(response?.results) && response.results) ||
      (Array.isArray(response?.data) && response.data) ||
      []
    );
  } catch (error) {
    console.error(`Error loading tags for event ${eventId}:`, error);
    return [];
  }
}

export function useUserSearch(query: string, options: UseSearchOptions = {}) {
  const { delayMs = 400 } = options;

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let active = true;

    const timeoutId = setTimeout(async () => {
      try {
        const data = await apiClient.get<any[]>(`/users/search/?search=${encodeURIComponent(normalizedQuery)}`);
        if (!active) return;
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        console.error('Error buscando usuarios:', err);
        setError(err as Error);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [query, delayMs]);

  return { results, loading, error };
}

export function useCalendarSearch(query: string, options: UseSearchOptions = {}) {
  const { delayMs = 400 } = options;

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let active = true;

    const timeoutId = setTimeout(async () => {
      try {
        const data = await apiClient.get<any[]>(`/calendars/list?q=${encodeURIComponent(normalizedQuery)}`);
        if (!active) return;

        const baseResults = Array.isArray(data) ? data : [];

        const enrichedResults = await Promise.all(
          baseResults.map(async (calendar: any) => {
            const categories = await loadCalendarCategories(calendar.id);

            return {
              ...calendar,
              categories,
            };
          })
        );

        if (!active) return;
        setResults(enrichedResults);
      } catch (err) {
        if (!active) return;
        console.error('Error buscando calendarios:', err);
        setError(err as Error);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [query, delayMs]);

  return { results, loading, error };
}

export function useEventSearch(query: string, options: UseSearchOptions = {}) {
  const { delayMs = 400 } = options;

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let active = true;

    const timeoutId = setTimeout(async () => {
      try {
        const data = await apiClient.get<any>(`/events/list?q=${encodeURIComponent(normalizedQuery)}`);
        if (!active) return;

        let fetchedResults: any[] = [];
        if (Array.isArray(data)) {
          fetchedResults = data;
        } else if (data && Array.isArray(data.results)) {
          fetchedResults = data.results;
        }

        const enrichedResults = await Promise.all(
          fetchedResults.map(async (event: any) => {
            const tags = await loadEventTags(event.id);

            return {
              ...event,
              tags,
            };
          })
        );

        if (!active) return;
        setResults(enrichedResults);
      } catch (err) {
        if (!active) return;
        console.error('Error buscando eventos:', err);
        setError(err as Error);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [query, delayMs]);

  return { results, loading, error };
}

export function useFollowUserAction() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const followUser = async (id: string) => {
    setLoadingId(id);
    setError(null);

    try {
      const data = await apiClient.post<{ followed: boolean }>(`/users/${id}/follow/`, {});
      return data as { followed: boolean };
    } catch (err) {
      console.error('Error siguiendo usuario:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoadingId(null);
    }
  };

  return {
    followUser,
    loadingId,
    error,
  };
}