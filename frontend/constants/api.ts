const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const API_CONFIG = {
  baseURL: API_URL,
  endpoints: {
    mock: `${API_URL}mock`,
  },
};

export default API_CONFIG;
