import { useState, useEffect } from 'react';
import apiClient from '@/services/api-client';

export interface RecommendedEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  calendar_id: string;
  calendar_name: string;
  creator_username?: string;
  location?: string;
  color?: string;
}

export interface UseRecommendedEventsResult {
  events: RecommendedEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch recommended events from the backend.
 * Handles response unwrapping and provides loading/error states.
 */
export function useRecommendedEvents(): UseRecommendedEventsResult {
  const [events, setEvents] = useState<RecommendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.get<any[]>('/recommendations/events/');
      const eventData = Array.isArray(resp) ? resp : (resp as any)?.data || [];

      const mappedEvents: RecommendedEvent[] = eventData.map((e: any) => ({
        id: String(e.id),
        title: e.title,
        description: e.description || '',
        start_date: e.start_date,
        end_date: e.end_date,
        calendar_id: String(e.calendar_id),
        calendar_name: e.calendar_name || 'Unknown',
        creator_username: e.creator_username,
        location: e.location,
        color: e.color,
      }));

      setEvents(mappedEvents);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recommended events';
      setError(message);
      console.error('Error fetching recommended events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, []);

  return { events, loading, error, refetch: fetchEvents };
}
