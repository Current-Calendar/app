import { useEffect, useState } from 'react';
import apiClient from '@/services/api-client';

interface UseSearchOptions {
  delayMs?: number;
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
        setResults(Array.isArray(data) ? data : []);
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
        const data = await apiClient.get<any[]>(`/events/list?q=${encodeURIComponent(normalizedQuery)}`);
        if (!active) return;
        setResults(Array.isArray(data) ? data : []);
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
