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
    getCalendars: buildEndpoint('calendarios/list'),
    getEvents: buildEndpoint('eventos/list'),
    deleteCalendar: (calendarId: number) => buildEndpoint(`api/v1/calendarios/${calendarId}/eliminar/`),
  },
};

export default API_CONFIG;
