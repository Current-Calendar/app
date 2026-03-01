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
    searchUsers: (query: string) => buildEndpoint(`usuarios?search=${encodeURIComponent(query)}`),
    searchCalendars: (query: string) => buildEndpoint(`calendarios/list?q=${encodeURIComponent(query)}`),
    searchEvents: (query: string) => buildEndpoint(`eventos/list?q=${encodeURIComponent(query)}`)
  },
};

export default API_CONFIG;
