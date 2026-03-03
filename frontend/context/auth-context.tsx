import * as React from 'react';
import { createContext, useEffect, useState, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        await apiClient.loadTokens();

        if (apiClient.user) {
          setUser(apiClient.user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error bootstrapping session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      try {
        apiClient.login(username, password);

        setUser(apiClient.user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      setUser(null);
      setIsAuthenticated(false);
      apiClient.clearTokens();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
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