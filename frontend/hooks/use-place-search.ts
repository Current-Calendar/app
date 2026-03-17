import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

export type PlaceSuggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

interface UsePlaceSearchOptions {
  enabled?: boolean;
  delayMs?: number;
  limit?: number;
}

export function usePlaceSearch(query: string, options: UsePlaceSearchOptions = {}) {
  const {
    enabled = true,
    delayMs = 350,
    limit = 6,
  } = options;

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const q = query.trim();
    setError(null);

    if (!q || q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const url =
          `${NOMINATIM_SEARCH_URL}` +
          `?q=${encodeURIComponent(q)}` +
          '&format=json' +
          '&addressdetails=1' +
          `&limit=${limit}`;

        const headers: Record<string, string> = {
          Accept: 'application/json',
        };
        if (Platform.OS !== 'web') {
          headers['User-Agent'] = 'CurrentApp/1.0 (ISPP project)';
        }

        const res = await fetch(url, { headers });
        const data = (await res.json()) as any[];

        if (cancelled) return;

        const mapped: PlaceSuggestion[] = (Array.isArray(data) ? data : [])
          .map((item) => ({
            place_id: Number(item?.place_id ?? 0),
            display_name: String(item?.display_name ?? ''),
            lat: String(item?.lat ?? ''),
            lon: String(item?.lon ?? ''),
          }))
          .filter((item) => item.place_id && item.display_name && item.lat && item.lon);

        setSuggestions(mapped);
      } catch (err: any) {
        if (cancelled) return;
        setSuggestions([]);
        setError(err?.message ?? 'Error buscando ubicaciones');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, query, delayMs, limit]);

  return {
    suggestions,
    loading,
    error,
  };
}
