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

    mock: buildEndpoint("mock"),
    register: buildEndpoint("auth/registro/"),
    deleteCalendar: (calendarId: number) => buildEndpoint(`calendarios/${calendarId}/eliminar/`),
    createCalendar: buildEndpoint('calendarios'),
    editCalendar: (calendarId: number) => buildEndpoint(`calendarios/${calendarId}/editar/`),
  },
};

export default API_CONFIG;