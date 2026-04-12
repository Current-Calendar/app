const DEFAULT_FREQUENCY = 5; // un anuncio cada 5 items

type AdItem = { _type: 'ad'; id: string };

export function injectAds<T>(
  items: T[],
  frequency: number = DEFAULT_FREQUENCY
): (T | AdItem)[] {
  return items.flatMap((item, index) => {
    const isAdSlot = (index + 1) % frequency === 0;
    return isAdSlot
      ? [item, { _type: 'ad' as const, id: `ad-${index}` }]
      : [item];
  });
}

export function isAdItem(item: unknown): item is AdItem {
  return typeof item === 'object' && item !== null && (item as any)._type === 'ad';
}