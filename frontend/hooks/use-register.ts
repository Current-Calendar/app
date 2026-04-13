import { useState } from 'react';
import apiClient from '@/services/api-client';

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password2: string;
  accepted_privacy: boolean;
  accepted_cookies: boolean;
  accepted_terms: boolean;
}

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const registerUser = async (payload: RegisterPayload) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.register(payload);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    registerUser,
    loading,
    error,
  };
}
