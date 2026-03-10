import { useEffect, useState } from 'react';
import apiClient from '@/services/api-client';

export interface FollowedCalendarItem {
  id: number;
  nombre: string;
  descripcion: string;
  estado: string;
  portada: string;
  fecha_creacion?: string;
}

interface UseFollowedCalendarsOptions {
  enabled?: boolean;
}

type OwnProfileFollowingCalendar = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  portada?: string | null;
  fecha_creacion?: string;
  creador?: string;
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
        const ownProfile = await apiClient.get<OwnProfileResponse>('/users/me');
        const ownFollowed = Array.isArray(ownProfile?.following_calendars)
          ? ownProfile.following_calendars
          : [];

        const filtered = ownFollowed.filter((calendar) =>
          String(calendar.creador ?? '').trim().toLowerCase() === normalizedViewedUsername
        );

        setCalendars(
          filtered.map((calendar) => ({
            id: Number(calendar.id),
            nombre: calendar.nombre ?? '',
            descripcion: calendar.descripcion ?? '',
            estado: calendar.estado ?? 'PUBLICO',
            portada: calendar.portada ?? '',
            fecha_creacion: calendar.fecha_creacion,
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
