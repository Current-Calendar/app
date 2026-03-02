const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, '');

const normalizedBaseURL = stripTrailingSlashes(API_URL);

const buildEndpoint = (path: string) => {
  const normalizedPath = stripLeadingSlashes(path);
  if (!normalizedBaseURL) {
    return `/${normalizedPath}`;
  }
  return `${normalizedBaseURL}/${normalizedPath}`;
};

export const API_CONFIG = {
  baseURL: normalizedBaseURL,
  endpoints: {
    mock: buildEndpoint('mock'),
    deleteCalendar: (calendarId: number) => buildEndpoint(`calendarios/${calendarId}/eliminar/`),
    createCalendar: buildEndpoint('calendarios'),
    editCalendar: (calendarId: number) => buildEndpoint(`calendarios/${calendarId}/editar/`),
    listCalendars: buildEndpoint('calendarios/list'),
    createEvent: buildEndpoint('eventos'),
    getEvent: (eventId: number) => buildEndpoint(`eventos/${eventId}`),
    editEvent: (eventId: number) => buildEndpoint(`eventos/${eventId}`),
    deleteEvent: (eventId: number) => buildEndpoint(`events/${eventId}/`),
  },
};

export default API_CONFIG;
