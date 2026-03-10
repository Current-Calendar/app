import { useCallback, useState } from 'react';
import apiClient from '@/services/api-client';

export function useProfileActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getOwnProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.get<any>('/users/me');
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOwnProfile = useCallback(async (payload: unknown) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.put<any>('/users/me', payload);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOwnProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.delete<any>('/users/me');
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getOwnProfile,
    updateOwnProfile,
    deleteOwnProfile,
  };
}
