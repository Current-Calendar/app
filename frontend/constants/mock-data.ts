// TODO BACKEND - Replace these mocks with real API calls once the backend is
// available. See API_CONFIG in constants/api.ts for the base URL.

import { Calendar, CalendarEvent } from '@/types/calendar';

export const MOCK_CALENDARS: Calendar[] = [
    {
        id: 'personal',
        name: 'Personal',
        description: 'My personal calendar for everyday tasks and reminders.',
        cover: 'https://picsum.photos/seed/calendar/800/400',
        privacy: 'PRIVATE',
        origin: 'CURRENT',
        creator: 'pablo',
        color: '#6C63FF',
    },
    {
        id: 'work',
        name: 'Work',
        description: 'Team meetings, sprints, and deployment schedules.',
        privacy: 'PRIVATE',
        origin: 'GOOGLE',
        creator: 'pablo',
        color: '#FF6584',
    },
    {
        id: 'family',
        name: 'Family',
        description: 'Family birthdays, dinners, and gatherings.',
        privacy: 'PUBLIC',
        origin: 'CURRENT',
        creator: 'pablo',
        color: '#43D9AD',
    },
    {
        id: 'holidays',
        name: 'Holidays',
        description: 'National and regional holidays.',
        cover: undefined,
        privacy: 'PUBLIC',
        origin: 'APPLE',
        creator: 'admin',
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
        title: 'Morning run',
        description: 'Quick 5K jog around the park.',
        place_name: 'Central Park',
        location: { latitude: 40.785091, longitude: -73.968285 },
        date: `${y}-${m}-${d(today.getDate())}`,
        time: '07:00',
        recurrence: 'WEEKLY',
        type: 'other',
        color: '#6C63FF',
    },
    {
        id: 'e2',
        calendarId: 'personal',
        title: 'Doctor appointment',
        description: 'Annual check-up with Dr. Martinez.',
        place_name: 'City Health Clinic',
        location: { latitude: 40.748817, longitude: -73.985428 },
        date: `${y}-${m}-${d(today.getDate() + 2)}`,
        time: '10:30',
        type: 'meeting',
        color: '#6C63FF',
    },
    {
        id: 'e3',
        calendarId: 'personal',
        title: 'Buy groceries',
        description: 'Milk, eggs, bread, vegetables.',
        place_name: 'Supermarket',
        date: `${y}-${m}-${d(today.getDate() + 1)}`,
        time: '18:00',
        type: 'task',
        color: '#6C63FF',
    },

    // ── Work ─────────────────────────────────────────────────
    {
        id: 'e4',
        calendarId: 'work',
        title: 'Sprint planning',
        description: 'Planning session for sprint #14.',
        place_name: 'Office - Room B2',
        date: `${y}-${m}-${d(today.getDate())}`,
        time: '09:00',
        type: 'meeting',
        color: '#FF6584',
    },
    {
        id: 'e5',
        calendarId: 'work',
        title: 'Code review',
        description: 'Review PR #342 for the auth module.',
        place_name: '',
        date: `${y}-${m}-${d(today.getDate() + 3)}`,
        time: '14:00',
        type: 'task',
        color: '#FF6584',
    },
    {
        id: 'e6',
        calendarId: 'work',
        title: 'Deploy v2.0',
        description: 'Production deploy of version 2.0.',
        place_name: '',
        date: `${y}-${m}-${d(today.getDate() + 5)}`,
        time: '18:00',
        recurrence: null,
        type: 'task',
        color: '#FF6584',
    },

    // ── Family ───────────────────────────────────────────────
    {
        id: 'e7',
        calendarId: 'family',
        title: "Mom's birthday",
        description: 'Surprise party at the house!',
        place_name: 'Home',
        date: `${y}-${m}-${d(today.getDate() + 4)}`,
        time: '12:00',
        recurrence: 'YEARLY',
        type: 'birthday',
        color: '#43D9AD',
    },
    {
        id: 'e8',
        calendarId: 'family',
        title: 'Family dinner',
        description: 'Monthly family get together.',
        place_name: 'La Trattoria Restaurant',
        location: { latitude: 37.3861, longitude: -5.9926 },
        date: `${y}-${m}-${d(today.getDate() + 7)}`,
        time: '20:00',
        recurrence: 'MONTHLY',
        type: 'other',
        color: '#43D9AD',
    },

    // ── Holidays ─────────────────────────────────────────────
    {
        id: 'e9',
        calendarId: 'holidays',
        title: 'National holiday',
        description: 'Public holiday - offices closed.',
        place_name: '',
        date: `${y}-${m}-${d(today.getDate() + 10)}`,
        time: '00:00',
        type: 'holiday',
        color: '#FFB84C',
    },
];
