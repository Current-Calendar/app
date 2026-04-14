export interface User {
  id: number;
  username: string;
  email: string;
  photo?: string;
  pronouns?: string;
  bio?: string;
  plan: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  accepted_privacy: boolean;
  accepted_cookies: boolean;
  accepted_terms: boolean;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}