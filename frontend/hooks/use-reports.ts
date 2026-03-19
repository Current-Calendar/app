import { useState } from 'react';
import apiClient from '@/services/api-client';

export type ReportReason =
  | 'INAPPROPRIATE_CONTENT'
  | 'SPAM'
  | 'ABUSIVE_BEHAVIOR'
  | 'OTHER';

export type ReportResourceType =
  | 'EVENT'
  | 'CALENDAR'
  | 'USER';

type CreateReportPayload = {
  resource_type: ReportResourceType;
  resource_id: number;
  reason: ReportReason;
  description?: string;
};

export function useReports() {
  const [loading, setLoading] = useState(false);

  const submitReport = async (payload: CreateReportPayload) => {
    setLoading(true);

    try {
      await apiClient.post('/reports/create/', payload);
    } finally {
      setLoading(false);
    }
  };

  return { submitReport, loading };
}