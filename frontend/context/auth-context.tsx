import * as React from 'react';
import { createContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@/services/api-client';
import {
  User,
  LoginCredentials,
  RegisterData,
  TokenResponse,
  AuthContextType,
} from '@/types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('accessToken');
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedToken && storedRefreshToken) {
          setAccessToken(storedToken);
          setRefreshToken(storedRefreshToken);
          apiClient.setTokens(storedToken, storedRefreshToken);

          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
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
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      try {
        const response = await apiClient.post<TokenResponse>('/api/v1/token/', {
          username: credentials.username,
          password: credentials.password,
        });

        setAccessToken(response.access);
        setRefreshToken(response.refresh);
        apiClient.setTokens(response.access, response.refresh);

        await AsyncStorage.setItem('accessToken', response.access);
        await AsyncStorage.setItem('refreshToken', response.refresh);

        // Obtener datos del usuario actual
        const userResponse = await apiClient.get<User>('/api/v1/users/me');
        setUser(userResponse);
        await AsyncStorage.setItem('user', JSON.stringify(userResponse));
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
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      apiClient.clearTokens();

      await Promise.all([
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('refreshToken'),
        AsyncStorage.removeItem('user'),
      ]);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      await apiClient.post('/api/v1/auth/registro/', {
        username: data.username,
        email: data.email,
        password: data.password,
        password2: data.password2,
      });

      // Después de registrar, hacer login automáticamente
      await login({
        username: data.username,
        password: data.password,
      });
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.post<TokenResponse>(
        '/api/v1/token/refresh/',
        {
          refresh: refreshToken,
        }
      );

      setAccessToken(response.access);
      apiClient.setTokens(response.access, refreshToken);
      await AsyncStorage.setItem('accessToken', response.access);
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
      throw error;
    }
  }, [refreshToken, logout]);

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    isLoading,
    isAuthenticated: !!accessToken,
    login,
    logout,
    register,
    refreshAccessToken,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}