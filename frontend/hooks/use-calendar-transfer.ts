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

  const downloadCalendarFile = async (calendarId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await downloadCalendar(calendarId);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importFromICS = async () => {
    setLoading(true);
    setError(null);
    try {
      return await importICS();
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

  const importFromIOS = async (calendarUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      return await importIOSCalendar(calendarUrl);
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
