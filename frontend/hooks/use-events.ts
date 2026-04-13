import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/services/api-client';

interface UseEventsOptions {
  autoFetch?: boolean;
  pageSize?: number;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

export function useEventsList(options: UseEventsOptions = {}) {
  const { autoFetch = true, pageSize = 20 } = options;

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const fetchEvents = useCallback(async (ids?: string) => {
    if (ids !== undefined && ids === '') {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null); 
    try {
      const url = ids 
        ? `/events/list?calendarIds=${ids}`
        : `/events/list?page_size=${pageSize}`;
      const data = await apiClient.get<PaginatedResponse | any[]>(url);
      if (Array.isArray(data)) {
        setEvents(data);
        setNextUrl(null);
        setHasMore(false);
      } else {
        setEvents(data.results ?? []);
        setNextUrl(data.next);
        setHasMore(data.next !== null);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setEvents([]);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const fetchMore = useCallback(async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await apiClient.get<PaginatedResponse>(nextUrl);
      setEvents(prev => [...prev, ...(data.results ?? [])]);
      setNextUrl(data.next);
      setHasMore(data.next !== null);
    } catch (err) {
      console.error('Error fetching more events:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextUrl, loadingMore]);

  useEffect(() => {
    if (autoFetch) {
      void fetchEvents();
    }
  }, [autoFetch, fetchEvents]);

  return {
    events,
    loading,
    loadingMore,
    error,
    hasMore,
    refetch: fetchEvents,
    fetchMore,
  };
}
