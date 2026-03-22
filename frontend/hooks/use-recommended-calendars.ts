import { useState, useEffect } from 'react';
import apiClient from '@/services/api-client';
import { Calendar } from '@/types/calendar';

export interface UseRecommendedCalendarsResult {
  calendars: Calendar[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch recommended calendars from the backend.
 * Handles response unwrapping and provides loading/error states.
 */
export function useRecommendedCalendars(): UseRecommendedCalendarsResult {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.get<any[]>('/recommendations/calendars/');
      const calData = Array.isArray(resp) ? resp : (resp as any)?.data || [];

      const COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB84C', '#FF9F43', '#00CFE8'];

      const mappedCalendars: Calendar[] = calData.map((c: any, index: number) => ({
        id: String(c.id),
        name: c.name,
        description: c.description || '',
        privacy: c.privacy,
        origin: c.origin,
        creator: c.creator_username || c.creator || 'unknown',
        color: COLORS[index % COLORS.length],
        cover: c.cover || null,
      }));

      setCalendars(mappedCalendars);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recommended calendars';
      setError(message);
      console.error('Error fetching recommended calendars:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCalendars();
  }, []);

  return { calendars, loading, error, refetch: fetchCalendars };
}
