// ─── Domain Types (mirrors backend/main/models.py) ─────────────────────────

export type PrivacyStatus = 'PRIVATE' | 'FRIENDS' | 'PUBLIC';

export type CalendarOrigin = 'CURRENT' | 'GOOGLE' | 'APPLE';

export type EventType = 'meeting' | 'task' | 'reminder' | 'holiday' | 'birthday' | 'other';

export interface Calendar {
    id: string;
    name: string;
    description: string;
    cover?: string;         // URL to cover image
    privacy: PrivacyStatus;
    origin: CalendarOrigin;
    creator: string;        // username
    color: string;          // UI-only accent color
    likes_count: number;
    liked_by_me: boolean;
}

export interface CalendarEvent {
    id: string;
    calendarId: string;
    title: string;
    description: string;
    place_name: string;
    location?: { latitude: number; longitude: number } | null;
    date: string;           // YYYY-MM-DD
    time: string;           // HH:mm
    photo?: string;         // URL to event image
    recurrence?: string | null;
    type?: EventType;       // UI-only filter type (TODO BACKEND mapping)
    color?: string;         // UI-only, inherited from calendar
}

// ─── API Response shapes (to be connected to backend) ─────────────────────────

export interface CalendarsResponse {
    calendars: Calendar[];
}

export interface EventsResponse {
    events: CalendarEvent[];
}
