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
    nearbyEvents: (lat: number, lon: number, radio: number) => buildEndpoint(`radar?lat=${lat}&lon=${lon}&radio=${radio}`),
    createCalendar: buildEndpoint('calendarios'),
    editCalendar: (calendarId: number) => buildEndpoint(`calendarios/${calendarId}/editar/`),
  },
};

export default API_CONFIG;
