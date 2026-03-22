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

    register: buildEndpoint("auth/register/"),
    mock: buildEndpoint('mock'),
    getCalendars: buildEndpoint('calendars/list/'),
    getEvents: buildEndpoint('events/list'),
    deleteCalendar: (calendarId: number) => buildEndpoint(`calendars/${calendarId}/delete/`),
    ownProfile: buildEndpoint('users/me/'),
    searchUsers: (query: string) => buildEndpoint(`users/search?search=${encodeURIComponent(query)}`),
    searchCalendars: (query: string) => buildEndpoint(`calendars/list?q=${encodeURIComponent(query)}`),
    searchEvents: (query: string) => buildEndpoint(`events/list?q=${encodeURIComponent(query)}`),
    nearbyEvents: (lat: number, lon: number, radius: number) => buildEndpoint(`radar/?lat=${lat}&lon=${lon}&radius=${radius}`),
    createCalendar: buildEndpoint('calendars/create/'),
    editCalendar: (calendarId: number) => buildEndpoint(`calendars/${calendarId}/edit/`),
    createEvent: buildEndpoint('events/create/'),
    getEvent: (eventId: number | string) => buildEndpoint(`events/${eventId}/edit/`),
    editEvent: (eventId: number | string) => buildEndpoint(`events/${eventId}/edit/`),
    deleteEvent: (eventId: string) => buildEndpoint(`events/${eventId}/delete/`),
    recoverPassword: buildEndpoint('auth/recover-password/'),
    setNewPassword: buildEndpoint('auth/set-new-password/'),
    validateResetToken: buildEndpoint('auth/validate-reset-token/'),
    recommendedEvents: buildEndpoint(`/recommendations/events/`),
    recommendedCalendars: buildEndpoint(`/recommendations/calendars/`),
  },
};

export default API_CONFIG;