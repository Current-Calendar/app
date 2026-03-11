import { useEffect, useState } from 'react';
import apiClient from '@/services/api-client';

export interface FollowedCalendarItem {
  id: number;
  name: string;
  description: string;
  privacy: string;
  cover: string;
  created_at?: string;
}

interface UseFollowedCalendarsOptions {
  enabled?: boolean;
}

type OwnProfileFollowingCalendar = {
  id: number;
  name: string;
  description?: string | null;
  privacy: string;
  cover?: string | null;
  created_at?: string;
  creator?: string;
};

type OwnProfileResponse = {
  following_calendars?: OwnProfileFollowingCalendar[];
};

export function useFollowedCalendars(viewedUsername?: string, options: UseFollowedCalendarsOptions = {}) {
  const { enabled = true } = options;

  const [calendars, setCalendars] = useState<FollowedCalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const normalizedViewedUsername = (viewedUsername ?? '').trim().toLowerCase();

    if (!enabled || !normalizedViewedUsername) {
      setCalendars([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const ownProfile = await apiClient.get<OwnProfileResponse>('/users/me/');
        const ownFollowed = Array.isArray(ownProfile?.following_calendars)
          ? ownProfile.following_calendars
          : [];

        const filtered = ownFollowed.filter((calendar) =>
          String(calendar.creator ?? '').trim().toLowerCase() === normalizedViewedUsername
        );

        setCalendars(
          filtered.map((calendar) => ({
            id: Number(calendar.id),
            name: calendar.name ?? '',
            description: calendar.description ?? '',
            privacy: calendar.privacy ?? 'PUBLIC',
            cover: calendar.cover ?? '',
            created_at: calendar.created_at,
          }))
        );
      } catch (err) {
        console.error('Error fetching followed calendars:', err);
        setCalendars([]);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [enabled, viewedUsername]);

  return {
    calendars,
    loading,
    error,
  };
}
