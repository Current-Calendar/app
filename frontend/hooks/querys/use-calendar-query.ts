import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/services/api-client';

const GRAPHQL_URL = `${process.env.EXPO_PUBLIC_API_BASE}/graphql/`;

function graphqlHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = apiClient.getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const SINGLE_CALENDAR_WITH_EVENTS_QUERY = `
  query GetCalendar($id: Int!) {
    calendar(id: $id) {
      id
      name
      description
      cover
      privacy
      origin
      creatorUsername
      creatorId
      likesCount
      events {
        id
        title
        description
        placeName
        date
        endDate
        time
        endTime
        recurrence
        photo
        attendees {
          id
          name
          respondedAt
          avatar
        }
      }
    }
  }
`;

export function useCalendarQuery(calendarId: string | undefined | null) {
  const [calendar, setCalendar] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!calendarId) return;

    let cancelled = false;
    const numericId = parseInt(calendarId, 10);

    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: graphqlHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        query: SINGLE_CALENDAR_WITH_EVENTS_QUERY,
        variables: { id: numericId },
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;

        if (json.errors) {
          throw new Error(json.errors[0].message);
        }

        const calendarData = json.data?.calendar;

        if (!calendarData) {
          setNotFound(true);
        } else {
          setCalendar(calendarData);
          const mappedEvents = (calendarData.events ?? []).map((e: any) => ({
            ...e,
            calendarIds: [Number(calendarData.id)],
          }));
          setEvents(mappedEvents);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useCalendarQuery]', err);
          setError(err.message || 'Error de conexión');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [calendarId, reloadKey]);

  return { calendar, events, loading, error, notFound, reload };
}

export type CalendarScreenCategory = {
  id: string;
  name: string;
};

export type CalendarScreenUser = {
  id: string;
  username: string;
};

export type CalendarScreenCalendar = {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  privacy: string;
  origin: string;
  creatorUsername: string;
  creatorId: number;
  likesCount: number;
  coOwners: CalendarScreenUser[];
  viewers: CalendarScreenUser[];
  categories: CalendarScreenCategory[];
};

export function useCalendarScreen() {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: graphqlHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        query: `
          query GetDashboardData {
            dashboardCalendars {
              id
              name
              description
              cover
              privacy
              origin
              creatorUsername
              creatorId
              likesCount
              coOwners {
                id
                username
              }
              viewers {
                id
                username
              }
              categories {
                id
                name
              }
              events {
                id
                title
                description
                placeName
                date
                endDate
                time
                endTime
                recurrence
                photo
                attendees {
                  id
                  name
                  respondedAt
                  avatar
  }
              }
            }
          }
        `
      }),
    })
      .then(r => r.json())
      .then((json) => {
        if (cancelled) return;

        if (json.errors) {
          throw new Error(json.errors[0].message);
        }

        const fetchedCalendars = json.data?.dashboardCalendars ?? [];
        setCalendars(fetchedCalendars);

        const allEvents = fetchedCalendars.flatMap((c: any) =>
          (c.events ?? []).map((e: any) => ({
            ...e,
            calendarIds: [Number(c.id)],
          }))
        );
        setEvents(allEvents);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Error de conexión");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadKey]);

  return { calendars, events, loading, error, reload };
}
