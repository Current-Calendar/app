import * as React from 'react';
import { createContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import apiClient from '@/services/api-client';
import {
  User,
  AuthContextType,
} from '@/types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Keep this flag for the initial session bootstrap only.
  // Using it for login/logout remounts the tabs layout and can reset routing state.
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const forceLogout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    router.replace('/login' as any);
  }, [router]);

  // Load saved session on startup
  useEffect(() => {
    apiClient.setOnAuthFailure(forceLogout);

    const bootstrapAsync = async () => {
      try {
        await apiClient.loadTokens();

        if (apiClient.getAccessToken()) {
          // Validate token against the server — if it fails, clear session
          const user = await apiClient.get<User>('/users/me/');
          apiClient.user = user;
          setUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Tokens are stale or invalid — clear them silently
        await apiClient.clearTokens();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, [forceLogout]);

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        await apiClient.login(username, password);

        setUser(apiClient.user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = apiClient.getRefreshToken();
      setUser(null);
      setIsAuthenticated(false);
      apiClient.user = null;
      await apiClient.clearTokens();
      // Invalidate the refresh token server-side so it cannot be reused.
      if (refreshToken) {
        await apiClient.post('/token/blacklist/', { refresh: refreshToken }).catch(() => {});
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
