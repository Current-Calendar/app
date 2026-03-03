const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, "");

const normalizedBaseURL = stripTrailingSlashes(API_URL);

const rootBaseURL = normalizedBaseURL.replace(/\/api\/v1$/, "");


const buildRootEndpoint = (path: string) => {
  const normalizedPath = stripLeadingSlashes(path);
  if (!rootBaseURL) return `/${normalizedPath}`;
  return `${rootBaseURL}/${normalizedPath}`;
};

const buildEndpoint = (path: string) => {
  const normalizedPath = stripLeadingSlashes(path);
  if (!normalizedBaseURL) return `/${normalizedPath}`;
  return `${normalizedBaseURL}/${normalizedPath}`;
};

export const API_CONFIG = {
  rootBaseURL,
  BaseURL: normalizedBaseURL,

  endpoints: {
    graphql: buildRootEndpoint("graphql/"),

    register: buildEndpoint("auth/registro/"),
    mock: buildEndpoint('mock'),
    getCalendars: buildEndpoint('calendarios/list'),
    getEvents: buildEndpoint('eventos/list'),
    deleteCalendar: (calendarId: number) => buildEndpoint(`calendarios/${calendarId}/eliminar/`),
    searchUsers: (query: string) => buildEndpoint(`usuarios?search=${encodeURIComponent(query)}`),
    searchCalendars: (query: string) => buildEndpoint(`calendarios/list?q=${encodeURIComponent(query)}`),
    searchEvents: (query: string) => buildEndpoint(`eventos/list?q=${encodeURIComponent(query)}`),
    nearbyEvents: (lat: number, lon: number, radio: number) => buildEndpoint(`radar?lat=${lat}&lon=${lon}&radio=${radio}`),
    createCalendar: buildEndpoint('calendarios'),
    editCalendar: (calendarId: number) => buildEndpoint(`calendarios/${calendarId}/editar/`),
    createEvent: buildEndpoint('eventos'),
    getEvent: (eventId: number | string) => buildEndpoint(`eventos/${eventId}`),
    editEvent: (eventId: number | string) => buildEndpoint(`eventos/${eventId}`),
  },
};

export default API_CONFIG;