// ─── Domain Types (mirrors backend/main/models.py) ─────────────────────────

export type PrivacyStatus = 'PRIVADO' | 'AMIGOS' | 'PUBLICO';

export type CalendarOrigin = 'CURRENT' | 'GOOGLE' | 'APPLE';

export type EventType = 'meeting' | 'task' | 'reminder' | 'holiday' | 'birthday' | 'other';

export interface RecurrenceConfig {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[];      // 0-6 (Sun-Sat)
    endType: 'never' | 'date' | 'count';
    endDate?: string;           // YYYY-MM-DD
    endCount?: number;
}

export interface Calendar {
    id: string;
    nombre: string;
    descripcion: string;
    portada?: string;       // URL to cover image
    estado: PrivacyStatus;
    origen: CalendarOrigin;
    creador: string;        // username
    color: string;          // UI-only accent color
}

export interface CalendarEvent {
    id: string;
    calendarId: string;
    titulo: string;
    descripcion: string;
    nombre_lugar: string;
    ubicacion?: { latitude: number; longitude: number } | null;
    fecha: string;          // YYYY-MM-DD
    hora: string;           // HH:mm
    foto?: string;          // URL to event image
    recurrencia?: RecurrenceConfig | null;
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
