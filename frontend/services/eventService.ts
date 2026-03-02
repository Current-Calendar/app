import { API_CONFIG } from '@/constants/api';
import { RecurrenceConfig } from '@/types/calendar';

export interface CreateEventPayload {
  titulo: string;
  descripcion?: string;
  nombre_lugar?: string;
  fecha: string;            // YYYY-MM-DD
  hora: string;             // HH:mm:ss
  calendarios: number[];
  creador_id: number;
  recurrencia?: RecurrenceConfig | null;
  latitud?: number;
  longitud?: number;
}

export interface UpdateEventPayload {
  titulo?: string;
  descripcion?: string;
  nombre_lugar?: string;
  fecha?: string;
  hora?: string;
  calendarios?: number[];
  recurrencia?: RecurrenceConfig | null;
  latitud?: number;
  longitud?: number;
}

export interface EventResponse {
  id: number;
  titulo: string;
  descripcion: string;
  nombre_lugar: string;
  fecha: string;
  hora: string;
  recurrencia: RecurrenceConfig | null;
  id_externo: string | null;
  calendarios: number[];
  creador_id: number;
  fecha_creacion: string;
}

export interface CalendarListItem {
  id: number;
  nombre: string;
  descripcion: string;
  estado: string;
  origen: string;
  creador_id: number;
  creador_username: string;
  fecha_creacion: string;
}

export async function createEvent(payload: CreateEventPayload): Promise<EventResponse> {
  const response = await fetch(API_CONFIG.endpoints.createEvent, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.errors?.[0] ?? 'Error al crear evento');
  }
  return response.json();
}

export async function getEvent(eventId: number): Promise<EventResponse> {
  const response = await fetch(API_CONFIG.endpoints.getEvent(eventId));
  if (!response.ok) {
    throw new Error('Evento no encontrado');
  }
  return response.json();
}

export async function updateEvent(eventId: number, payload: UpdateEventPayload): Promise<EventResponse> {
  const response = await fetch(API_CONFIG.endpoints.editEvent(eventId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.errors?.[0] ?? 'Error al actualizar evento');
  }
  return response.json();
}

export async function deleteEvent(eventId: number): Promise<void> {
  const response = await fetch(API_CONFIG.endpoints.deleteEvent(eventId), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Error al eliminar evento');
  }
}

export async function fetchCalendars(): Promise<CalendarListItem[]> {
  const response = await fetch(API_CONFIG.endpoints.listCalendars);
  if (!response.ok) {
    throw new Error('Error al obtener calendarios');
  }
  return response.json();
}
