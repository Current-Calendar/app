import { useCallback, useEffect, useMemo, useState } from 'react';
import { EventLabel, EventType } from '@/types/calendar';
import apiClient from '@/services/api-client';

const DEFAULT_LABELS: EventLabel[] = [
  { id: 'meeting', name: 'Meeting', color: '#1F6A6A', isDefault: true },
  { id: 'task', name: 'Task', color: '#F2A3A6', isDefault: true },
  { id: 'reminder', name: 'Reminder', color: '#F7B801', isDefault: true },
  { id: 'holiday', name: 'Holiday', color: '#7B61FF', isDefault: true },
  { id: 'birthday', name: 'Birthday', color: '#FF8FB1', isDefault: true },
  { id: 'other', name: 'Other', color: '#9CA3AF', isDefault: true },
];

const COLOR_SWATCHES = ['#10464D', '#1F6A6A', '#F2A3A6', '#F7B801', '#7B61FF', '#FF8FB1', '#43D9AD', '#FF9F43'];

const sanitizeColor = (color?: string) => {
  if (!color) return COLOR_SWATCHES[0];
  return /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : COLOR_SWATCHES[0];
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function useEventLabels() {
  const [customLabels, setCustomLabels] = useState<EventLabel[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<{ labels: EventLabel[]; assignments?: Record<string, string[]> } | EventLabel[]>('/event-labels/');
      if (Array.isArray(data)) {
        setCustomLabels(data.filter((l) => !l.isDefault));
      } else if (data?.labels) {
        setCustomLabels((data.labels || []).filter((l) => !l.isDefault));
        if (data.assignments) setAssignments(data.assignments);
      }
    } catch (err) {
      console.warn('Failed to fetch labels from backend', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLabels();
  }, [fetchLabels]);

  const labels = useMemo<EventLabel[]>(() => [...DEFAULT_LABELS, ...customLabels], [customLabels]);
  const labelMap = useMemo(() => {
    const map: Record<string, EventLabel> = {};
    labels.forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [labels]);

  const addCustomLabel = useCallback((name: string, color?: string) => {
    const normalized = name.trim();
    if (!normalized) return;

    const idBase = slugify(normalized) || 'custom';
    const payload = { name: normalized, color: sanitizeColor(color), slug: idBase };

    setLoading(true);
    setError(null);

    apiClient
      .post<EventLabel>('/event-labels/', payload)
      .then((created) => {
        setCustomLabels((prev) => [...prev, created]);
      })
      .catch((err) => {
        setError(err as Error);
        console.warn('Failed to create label', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const removeCustomLabel = useCallback((labelId: string) => {
    setLoading(true);
    setError(null);
    apiClient
      .delete(`/event-labels/${labelId}/`)
      .then(() => {
        setCustomLabels((prev) => prev.filter((l) => l.id !== labelId));
        setAssignments((prev) => {
          const next: Record<string, string[]> = {};
          Object.entries(prev).forEach(([eventId, ids]) => {
            const filtered = ids.filter((id) => id !== labelId);
            if (filtered.length > 0) next[eventId] = filtered;
          });
          return next;
        });
      })
      .catch((err) => {
        setError(err as Error);
        console.warn('Failed to delete label', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleLabelForEvent = useCallback((eventId: string, labelId: string) => {
    setAssignments((prev) => {
      const current = prev[eventId] ?? [];
      const exists = current.includes(labelId);
      const updated = exists ? current.filter((id) => id !== labelId) : [...current, labelId];
      const next = { ...prev, [eventId]: updated };
      if (updated.length === 0) delete next[eventId];
      return next;
    });

    const exists = assignments[eventId]?.includes(labelId);
    const method = exists ? 'delete' : 'post';
    const endpoint = `/events/${eventId}/labels/${labelId}/`;

    setLoading(true);
    setError(null);
    (apiClient as any)[method](endpoint, exists ? undefined : {})
      .catch((err: Error) => {
        // revert optimistic update on failure
        setAssignments((prev) => {
          const current = prev[eventId] ?? [];
          const corrected = exists ? [...current, labelId] : current.filter((id) => id !== labelId);
          const next = { ...prev, [eventId]: corrected };
          if (corrected.length === 0) delete next[eventId];
          return next;
        });
        setError(err);
        console.warn('Failed to toggle label for event', err);
      })
      .finally(() => setLoading(false));
  }, [assignments]);

  const setLabelsForEvent = useCallback((eventId: string, labelIds: string[]) => {
    const unique = Array.from(new Set(labelIds));
    setAssignments((prev) => ({ ...prev, [eventId]: unique }));
    setLoading(true);
    setError(null);
    apiClient
      .put(`/events/${eventId}/labels/`, { labels: unique })
      .catch((err) => {
        setError(err as Error);
        console.warn('Failed to set labels for event', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const getLabelsForEvent = useCallback(
    (eventId: string) => assignments[eventId] ?? [],
    [assignments]
  );

  const getLabelObjects = useCallback(
    (labelIds: string[] | undefined) =>
      (labelIds ?? []).map((id) => labelMap[id]).filter(Boolean) as EventLabel[],
    [labelMap]
  );

  const labelIdFromType = useCallback((type?: EventType | null) => {
    if (!type) return null;
    const found = DEFAULT_LABELS.find((l) => l.id === type);
    return found ? found.id : null;
  }, []);

  return {
    labels,
    labelMap,
    customLabels,
    assignments,
    loading,
    error,
    refresh: fetchLabels,
    addCustomLabel,
    removeCustomLabel,
    toggleLabelForEvent,
    setLabelsForEvent,
    getLabelsForEvent,
    getLabelObjects,
    labelIdFromType,
    defaultLabels: DEFAULT_LABELS,
    colorPalette: COLOR_SWATCHES,
  };
}
