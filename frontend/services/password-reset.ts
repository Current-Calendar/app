import { Platform } from 'react-native';

import { API_CONFIG } from '@/constants/api';

const PASSWORD_RESET_SENT_FALLBACK =
  'If an account exists with this email, a password reset link has been sent.';

const DEFAULT_PASSWORD_RESET_ERROR_MESSAGE =
  'Could not send recovery email. Please try again.';

type PasswordResetResponse = {
  message?: string;
  error?: string;
};

type RequestPasswordResetOptions = {
  source?: string;
  errorMessage?: string;
};

function getPasswordResetSource() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return API_CONFIG.rootBaseURL;
}

export async function requestPasswordReset(
  email: string,
  options: RequestPasswordResetOptions = {},
) {
  const response = await fetch(API_CONFIG.endpoints.recoverPassword, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      source: options.source ?? getPasswordResetSource(),
    }),
  });

  const data = (await response.json().catch(() => null)) as PasswordResetResponse | null;

  if (!response.ok) {
    throw new Error(options.errorMessage ?? DEFAULT_PASSWORD_RESET_ERROR_MESSAGE);
  }

  return data?.message ?? PASSWORD_RESET_SENT_FALLBACK;
}
