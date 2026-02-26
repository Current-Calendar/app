// TODO BACKEND - Replace these mocks with real API calls once the backend is
// available. See API_CONFIG in constants/api.ts for the base URL.

import { Calendar, CalendarEvent } from '@/types/calendar';

export const MOCK_CALENDARS: Calendar[] = [
    {
        id: 'personal',
        nombre: 'Personal',
        descripcion: 'My personal calendar for everyday tasks and reminders.',
        portada: 'https://picsum.photos/seed/calendar/800/400',
        estado: 'PRIVADO',
        origen: 'CURRENT',
        creador: 'pablo',
        color: '#6C63FF',
    },
    {
        id: 'work',
        nombre: 'Work',
        descripcion: 'Team meetings, sprints, and deployment schedules.',
        estado: 'AMIGOS',
        origen: 'GOOGLE',
        creador: 'pablo',
        color: '#FF6584',
    },
    {
        id: 'family',
        nombre: 'Family',
        descripcion: 'Family birthdays, dinners, and gatherings.',
        estado: 'PUBLICO',
        origen: 'CURRENT',
        creador: 'pablo',
        color: '#43D9AD',
    },
    {
        id: 'holidays',
        nombre: 'Holidays',
        descripcion: 'National and regional holidays.',
        portada: undefined,
        estado: 'PUBLICO',
        origen: 'APPLE',
        creador: 'admin',
        color: '#FFB84C',
    },
];

const today = new Date();
const y = today.getFullYear();
const m = String(today.getMonth() + 1).padStart(2, '0');
const d = (n: number) => String(n).padStart(2, '0');

export const MOCK_EVENTS: CalendarEvent[] = [
    // ── Personal ─────────────────────────────────────────────
    {
        id: 'e1',
        calendarId: 'personal',
        titulo: 'Morning run',
        descripcion: 'Quick 5K jog around the park.',
        nombre_lugar: 'Central Park',
        ubicacion: { latitude: 40.785091, longitude: -73.968285 },
        fecha: `${y}-${m}-${d(today.getDate())}`,
        hora: '07:00',
        recurrencia: 'WEEKLY',
        type: 'other',
        color: '#6C63FF',
    },
    {
        id: 'e2',
        calendarId: 'personal',
        titulo: 'Doctor appointment',
        descripcion: 'Annual check-up with Dr. Martinez.',
        nombre_lugar: 'City Health Clinic',
        ubicacion: { latitude: 40.748817, longitude: -73.985428 },
        fecha: `${y}-${m}-${d(today.getDate() + 2)}`,
        hora: '10:30',
        type: 'meeting',
        color: '#6C63FF',
    },
    {
        id: 'e3',
        calendarId: 'personal',
        titulo: 'Buy groceries',
        descripcion: 'Milk, eggs, bread, vegetables.',
        nombre_lugar: 'Supermarket',
        fecha: `${y}-${m}-${d(today.getDate() + 1)}`,
        hora: '18:00',
        type: 'task',
        color: '#6C63FF',
    },

    // ── Work ─────────────────────────────────────────────────
    {
        id: 'e4',
        calendarId: 'work',
        titulo: 'Sprint planning',
        descripcion: 'Planning session for sprint #14.',
        nombre_lugar: 'Office - Room B2',
        fecha: `${y}-${m}-${d(today.getDate())}`,
        hora: '09:00',
        type: 'meeting',
        color: '#FF6584',
    },
    {
        id: 'e5',
        calendarId: 'work',
        titulo: 'Code review',
        descripcion: 'Review PR #342 for the auth module.',
        nombre_lugar: '',
        fecha: `${y}-${m}-${d(today.getDate() + 3)}`,
        hora: '14:00',
        type: 'task',
        color: '#FF6584',
    },
    {
        id: 'e6',
        calendarId: 'work',
        titulo: 'Deploy v2.0',
        descripcion: 'Production deploy of version 2.0.',
        nombre_lugar: '',
        fecha: `${y}-${m}-${d(today.getDate() + 5)}`,
        hora: '18:00',
        recurrencia: null,
        type: 'task',
        color: '#FF6584',
    },

    // ── Family ───────────────────────────────────────────────
    {
        id: 'e7',
        calendarId: 'family',
        titulo: "Mom's birthday",
        descripcion: 'Surprise party at the house!',
        nombre_lugar: 'Home',
        fecha: `${y}-${m}-${d(today.getDate() + 4)}`,
        hora: '12:00',
        recurrencia: 'YEARLY',
        type: 'birthday',
        color: '#43D9AD',
    },
    {
        id: 'e8',
        calendarId: 'family',
        titulo: 'Family dinner',
        descripcion: 'Monthly family get together.',
        nombre_lugar: 'La Trattoria Restaurant',
        ubicacion: { latitude: 37.3861, longitude: -5.9926 },
        fecha: `${y}-${m}-${d(today.getDate() + 7)}`,
        hora: '20:00',
        recurrencia: 'MONTHLY',
        type: 'other',
        color: '#43D9AD',
    },

    // ── Holidays ─────────────────────────────────────────────
    {
        id: 'e9',
        calendarId: 'holidays',
        titulo: 'National holiday',
        descripcion: 'Public holiday - offices closed.',
        nombre_lugar: '',
        fecha: `${y}-${m}-${d(today.getDate() + 10)}`,
        hora: '00:00',
        type: 'holiday',
        color: '#FFB84C',
    },
];
