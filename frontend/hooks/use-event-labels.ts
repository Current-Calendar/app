import { useCallback, useEffect, useMemo, useState } from 'react';
import { EventLabel, EventType } from '@/types/calendar';
import apiClient from '@/services/api-client';

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
  const [defaultLabels, setDefaultLabels] = useState<EventLabel[]>([]);
  const [customLabels, setCustomLabels] = useState<EventLabel[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<EventLabel[]>('/labels/');
      if (Array.isArray(data)) {
        const defaults = data.filter((l) => l.is_default || l.isDefault);
        setDefaultLabels(defaults);
        setCustomLabels(data.filter((l) => !l.is_default && !l.isDefault));
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

  const labels = useMemo<EventLabel[]>(() => [...defaultLabels, ...customLabels], [defaultLabels, customLabels]);
  const labelMap = useMemo(() => {
    const map: Record<string, EventLabel> = {};
    labels.forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [labels]);

  const addCustomLabel = useCallback(
    (
      name: string,
      color?: string,
      target?: { type: 'event' | 'calendar'; id: string | number }
    ) => {
      const normalized = name.trim();
      if (!normalized || !target) {
        console.warn('addCustomLabel requires name and target (event|calendar).');
        return;
      }

      const payload = { name: normalized, color: sanitizeColor(color) };
      const endpoint =
        target.type === 'event'
          ? `/events/${target.id}/labels/add/`
          : `/calendars/${target.id}/labels/add/`;

      setLoading(true);
      setError(null);

      apiClient
        .post(endpoint, payload)
        .then(() => {
          void fetchLabels();
        })
        .catch((err) => {
          setError(err as Error);
          console.warn('Failed to create label', err);
        })
        .finally(() => setLoading(false));
    },
    [fetchLabels]
  );

  const removeCustomLabel = useCallback(
    (labelId: string, target?: { type: 'event' | 'calendar'; id: string | number }) => {
      if (!target) {
        console.warn('removeCustomLabel requires a target (event|calendar).');
        return;
      }
      setLoading(true);
      setError(null);
      const endpoint =
        target.type === 'event'
          ? `/events/${target.id}/labels/remove/${labelId}/`
          : `/calendars/${target.id}/labels/remove/${labelId}/`;

      apiClient
        .delete(endpoint)
        .then(() => {
          setCustomLabels((prev) => prev.filter((l) => String(l.id) !== String(labelId)));
          setAssignments((prev) => {
            const next: Record<string, string[]> = {};
            Object.entries(prev).forEach(([entityId, ids]) => {
              const filtered = ids.filter((id) => id !== String(labelId));
              if (filtered.length > 0) next[entityId] = filtered;
            });
            return next;
          });
        })
        .catch((err) => {
          setError(err as Error);
          console.warn('Failed to delete label', err);
        })
        .finally(() => setLoading(false));
    },
    []
  );

  const toggleLabelForEvent = useCallback(
    (eventId: string, labelId: string, isSelected?: boolean) => {
      setAssignments((prev) => {
        const current = prev[eventId] ?? [];
        const exists = isSelected ?? current.includes(labelId);
        const updated = exists ? current.filter((id) => id !== labelId) : [...current, labelId];
        return { ...prev, [eventId]: updated };
      });

      const existsServer = isSelected ?? assignments[eventId]?.includes(labelId);
      const method = existsServer ? 'delete' : 'post';
      const endpoint = existsServer
        ? `/events/${eventId}/labels/remove/${labelId}/`
        : `/events/${eventId}/labels/add/`;

      setLoading(true);
      setError(null);
      (apiClient as any)[method](endpoint, existsServer ? undefined : { label_id: labelId })
        .catch((err: Error) => {
          // revert optimistic update on failure
          setAssignments((prev) => {
            const current = prev[eventId] ?? [];
            const corrected = existsServer ? [...current, labelId] : current.filter((id) => id !== labelId);
            return { ...prev, [eventId]: corrected };
          });
          setError(err);
          console.warn('Failed to toggle label for event', err);
        })
        .finally(() => setLoading(false));
    },
    [assignments]
  );

  const setLabelsForEvent = useCallback((eventId: string, labelIds: string[]) => {
    const desired = Array.from(new Set(labelIds)).map(String);
    const current = assignments[eventId] ?? [];
    const toAdd = desired.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !desired.includes(id));

    setAssignments((prev) => ({ ...prev, [eventId]: desired }));
    setLoading(true);
    setError(null);

    const addPromises = toAdd.map((id) =>
      apiClient.post(`/events/${eventId}/labels/add/`, { label_id: id })
    );
    const removePromises = toRemove.map((id) =>
      apiClient.delete(`/events/${eventId}/labels/remove/${id}/`)
    );

    Promise.allSettled([...addPromises, ...removePromises])
      .catch((err) => {
        setError(err as Error);
        console.warn('Failed to sync labels for event', err);
      })
      .finally(() => setLoading(false));
  }, [assignments]);

  const addLabelToCalendar = useCallback((calendarId: string | number, labelId: string) => {
    setLoading(true);
    setError(null);
    apiClient
      .post(`/calendars/${calendarId}/labels/add/`, { label_id: labelId })
      .catch((err) => {
        setError(err as Error);
        console.warn('Failed to add label to calendar', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const removeLabelFromCalendar = useCallback((calendarId: string | number, labelId: string) => {
    setLoading(true);
    setError(null);
    apiClient
      .delete(`/calendars/${calendarId}/labels/remove/${labelId}/`)
      .catch((err) => {
        setError(err as Error);
        console.warn('Failed to remove label from calendar', err);
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

  const labelIdFromType = useCallback((_type?: EventType | null) => null, []);

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
    addLabelToCalendar,
    removeLabelFromCalendar,
    getLabelsForEvent,
    getLabelObjects,
    labelIdFromType,
    colorPalette: COLOR_SWATCHES,
  };
}
