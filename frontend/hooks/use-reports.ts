import { useCallback, useState } from 'react';
import apiClient from '@/services/api-client';

export type ReportedType = 'USER' | 'EVENT' | 'CALENDAR';
export type ReportReason =
  | 'INAPPROPRIATE_CONTENT'
  | 'SPAM'
  | 'HARASSMENT'
  | 'OTHER';

export interface ReportPayload {
  reported_type: ReportedType;
  reason: ReportReason;
  description?: string;
  reported_user?: number;
  reported_event?: number;
  reported_calendar?: number;
}

// Cooldown in milliseconds between reports for the same item (5 minutes)
const REPORT_COOLDOWN_MS = 5 * 60 * 1000;

const buildStorageKey = (type: ReportedType, id: number): string =>
  `report_cooldown_${type}_${id}`;

const getReportedItemId = (
  payload: ReportPayload
): number | null => {
  if (payload.reported_type === 'USER' && payload.reported_user != null)
    return payload.reported_user;
  if (payload.reported_type === 'EVENT' && payload.reported_event != null)
    return payload.reported_event;
  if (
    payload.reported_type === 'CALENDAR' &&
    payload.reported_calendar != null
  )
    return payload.reported_calendar;
  return null;
};

export function useReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getRemainingCooldown = useCallback(
    (type: ReportedType, id: number): number => {
      const key = buildStorageKey(type, id);
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      const lastReportedAt = parseInt(raw, 10);
      if (isNaN(lastReportedAt)) return 0;
      const elapsed = Date.now() - lastReportedAt;
      return Math.max(0, REPORT_COOLDOWN_MS - elapsed);
    },
    []
  );

  const canReport = useCallback(
    (type: ReportedType, id: number): boolean =>
      getRemainingCooldown(type, id) === 0,
    [getRemainingCooldown]
  );

  const submitReport = useCallback(
    async (payload: ReportPayload) => {
      const itemId = getReportedItemId(payload);

      if (itemId != null) {
        const remaining = getRemainingCooldown(payload.reported_type, itemId);
        if (remaining > 0) {
          const minutes = Math.ceil(remaining / 60_000);
          throw new Error(
            `Debes esperar ${minutes} minuto${minutes !== 1 ? 's' : ''} antes de volver a reportar este elemento.`
          );
        }
      }

      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.post<any>('/reports/create/', payload);

        if (itemId != null) {
          localStorage.setItem(
            buildStorageKey(payload.reported_type, itemId),
            String(Date.now())
          );
        }

        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getRemainingCooldown]
  );

  return {
    loading,
    error,
    submitReport,
    canReport,
    getRemainingCooldown,
  };
}