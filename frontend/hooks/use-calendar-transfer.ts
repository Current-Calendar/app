import { useState } from 'react';
import {
  downloadCalendar,
  importGoogleCalendar,
  importICS,
  importIOSCalendar,
} from '@/services/calendarService';

export function useCalendarTransfer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const downloadCalendarFile = async (calendarId: string, token?: string) => {
    setLoading(true);
    setError(null);
    try {
      return await downloadCalendar(calendarId, token);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importFromICS = async (userId: number) => {
    setLoading(true);
    setError(null);
    try {
      return await importICS(userId);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importFromGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      return await importGoogleCalendar();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importFromIOS = async (calendarUrl: string, userId: number) => {
    setLoading(true);
    setError(null);
    try {
      return await importIOSCalendar(calendarUrl, userId);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    downloadCalendarFile,
    importFromICS,
    importFromGoogle,
    importFromIOS,
  };
}
