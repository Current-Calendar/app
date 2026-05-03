import { useState, useEffect, useCallback } from 'react';

export type CalendarViewData = {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  privacy: string;
  origin: string;
  creatorUsername: string;
  creatorId: number;
  likesCount: number;
};

export type CalendarViewEvent = {
  id: string;
  title: string;
  description?: string;
  placeName?: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  recurrence?: string;
  photo?: string;
  location?: { latitude: number; longitude: number } | null;
  calendarIds: string[];
};

const CALENDAR_VIEW_QUERY = `
  query CalendarView($calendarIds: [Int]!) {
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
    }
    eventsForCalendars(calendarIds: $calendarIds) {
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
      location {
        latitude
        longitude
      }
      calendarIds
    }
  }
`;

const PUBLIC_CALENDAR_QUERY = `
  query PublicCalendar($calendarIds: [Int]!) {
    eventsForCalendars(calendarIds: $calendarIds) {
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
      location {
        latitude
        longitude
      }
      calendarIds
    }
  }
`;

type UseCalendarViewReturn = {
  calendar: CalendarViewData | null;
  events: CalendarViewEvent[];
  loading: boolean;
  error: string | null;
  notFound: boolean;
  reload: () => void;
};

export function useCalendarQuery(calendarId: string | undefined | null): UseCalendarViewReturn {
  const [calendar, setCalendar] = useState<CalendarViewData | null>(null);
  const [events, setEvents] = useState<CalendarViewEvent[]>([]);
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

    fetch('/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: CALENDAR_VIEW_QUERY,
        variables: { calendarIds: [numericId] },
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(async (json) => {
        if (cancelled) return;

        if (json.errors?.length) {
          setError(json.errors[0].message ?? 'GraphQL error');
          return;
        }

        const allCalendars: any[] = json.data?.dashboardCalendars ?? [];
        const rawEvents: any[] = json.data?.eventsForCalendars ?? [];
        const found = allCalendars.find((c: any) => String(c.id) === calendarId) ?? null;

        if (found) {
          setCalendar(found);
          setEvents(rawEvents);
          return;
        }

        const publicRes = await fetch('/graphql/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: PUBLIC_CALENDAR_QUERY,
            variables: { calendarIds: [numericId] },
          }),
        });
        const publicJson = await publicRes.json();
        if (cancelled) return;

        if (publicJson.errors?.length) {
          setNotFound(true);
          return;
        }

        const publicEvents: any[] = publicJson.data?.eventsForCalendars ?? [];

        if (publicEvents.length === 0) {
          setNotFound(true);
          return;
        }

        setCalendar(null);
        setEvents(publicEvents);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[useCalendarView]', err);
        setError('Could not load this calendar. Please check your connection and try again.');
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

export type CalendarScreenCalendar = {
  id: string;
  name: string;
  description: string;
  cover?: string;
  privacy: string;
  origin: string;
  creatorUsername: string;
  creatorId: number;
  likesCount: number;
  coOwners: { username: string; name?: string }[];
  viewers: { id?: number; username: string; name?: string }[];
  categories: { id: string; name: string }[];
};

export type CalendarScreenEvent = {
  id: string;
  title: string;
  description?: string;
  placeName?: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  recurrence?: string;
  photo?: string;
  calendarIds: string[];
};

const DASHBOARD_QUERY = `
  query Dashboard {
    dashboard {
      calendars {
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
        calendarIds
      }
    }
  }
`;

type UseCalendarScreenReturn = {
  calendars: CalendarScreenCalendar[];
  events: CalendarScreenEvent[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useCalendarScreen(): UseCalendarScreenReturn {
  const [calendars, setCalendars] = useState<CalendarScreenCalendar[]>([]);
  const [events, setEvents] = useState<CalendarScreenEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetch('/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query: DASHBOARD_QUERY }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;

        if (json.errors?.length) {
          setError(json.errors[0].message ?? 'GraphQL error');
          return;
        }

        const rawCalendars: any[] = json.data?.dashboard?.calendars ?? [];
        const rawEvents: any[] = json.data?.dashboard?.events ?? [];

        setCalendars(
          rawCalendars.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            description: c.description ?? '',
            cover: c.cover ?? undefined,
            privacy: c.privacy,
            origin: c.origin,
            creatorUsername: c.creatorUsername,
            creatorId: c.creatorId,
            likesCount: c.likesCount ?? 0,
            coOwners: c.coOwners ?? [],
            viewers: c.viewers ?? [],
            categories: (c.categories ?? []).map((cat: any) => ({
              id: String(cat.id),
              name: cat.name,
            })),
          }))
        );

        setEvents(rawEvents);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[useCalendarScreen]', err);
        setError('Could not load calendars. Please check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { calendars, events, loading, error, reload };
}