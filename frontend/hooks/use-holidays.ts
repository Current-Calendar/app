import { useEffect, useRef, useState } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { API_CONFIG } from '@/constants/api';
import apiClient from '@/services/api-client';

export interface Holiday extends CalendarEvent {
  isHoliday: true;
}

const HOLIDAY_COLOR = '#E53935';

const HOLIDAYS_QUERY = `
  query GetHolidays($year: Int) {
    holidays(year: $year) {
      id
      title
      date
      time
      description
      placeName
    }
  }
`;

async function fetchHolidaysForYear(year: number): Promise<Holiday[]> {
  try {
    const token = apiClient.getAccessToken();
    const response = await fetch(API_CONFIG.endpoints.graphql, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: HOLIDAYS_QUERY,
        variables: { year },
      }),
    });

    if (!response.ok) return [];

    const json = await response.json();
    const events: any[] = json?.data?.holidays ?? [];

    return events.map((e) => ({
      id: String(e.id),
      calendarId: 'holidays',
      title: e.title,
      date: e.date,
      time: e.time ?? '00:00',
      description: e.description ?? '',
      place_name: e.placeName ?? '',
      photo: undefined,
      recurrence: undefined,
      type: 'holiday' as const,
      color: HOLIDAY_COLOR,
      isHoliday: true as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Returns Spanish national holidays for the given years, fetched from the backend.
 * To swap backends, only this file needs to change — Holiday[] return type is stable.
 *
 * @param years - Array of years to include (e.g. [2026, 2027])
 */
export function useHolidays(years: number[]): Holiday[] {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const yearsKey = years.join(',');
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function load() {
      const results = await Promise.all(years.map(fetchHolidaysForYear));
      if (cancelledRef.current) return;

      const seen = new Set<string>();
      const merged = results.flat().filter((h) => {
        if (seen.has(h.id)) return false;
        seen.add(h.id);
        return true;
      });
      setHolidays(merged);
    }

    void load();
    return () => {
      cancelledRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsKey]);

  return holidays;
}
