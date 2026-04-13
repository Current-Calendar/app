const DEFAULT_FREQUENCY = 5;

type AdItem = { _type: 'ad'; id: string };

export function injectAds<T>(
  items: T[],
  frequency: number = DEFAULT_FREQUENCY
): (T | AdItem)[] {
  if (items.length === 0) return [];

  const result = items.flatMap((item, index) => {
    const isAdSlot = (index + 1) % frequency === 0;
    return isAdSlot
      ? [item, { _type: 'ad' as const, id: `ad-${index}` }]
      : [item];
  });

  const hasAd = result.some(isAdItem);
  if (!hasAd) {
    result.push({ _type: 'ad' as const, id: 'ad-fallback' });
  }

  return result;
}

export function isAdItem(item: unknown): item is AdItem {
  return typeof item === 'object' && item !== null && (item as any)._type === 'ad';
}