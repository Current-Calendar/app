import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

type Placement = 'feed' | 'search' | 'events';

const AD_SLOTS: Record<Placement, string> = {
  feed:   'XXXXXXXXXX',
  search: 'XXXXXXXXXX',
  events: 'XXXXXXXXXX',
};

const AD_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';

interface AdCardProps {
  placement?: Placement;
}

export function AdCard({ placement = 'feed' }: AdCardProps) {
  const insRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.warn('AdSense error:', e);
    }
  }, []);

  return (
    <View style={styles.container}>
      <ins
        ref={insRef as any}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOTS[placement]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
    minHeight: 100,
  },
});