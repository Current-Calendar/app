import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Placement = 'feed' | 'search' | 'events';

const AD_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';

const AD_SLOTS: Record<Placement, string> = {
  feed:   'XXXXXXXXXX',
  search: 'XXXXXXXXXX',
  events: 'XXXXXXXXXX',
};

const IS_ADSENSE_APPROVED = false; // Cambiar cuando este lo de Adsense

interface AdCardProps {
  placement?: Placement;
}

export function AdCard({ placement = 'feed' }: AdCardProps) {
  useEffect(() => {
    if (!IS_ADSENSE_APPROVED) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.warn('AdSense error:', e);
    }
  }, []);

  if (!IS_ADSENSE_APPROVED) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderLabel}>AD PLACEHOLDER · {placement}</Text>
        <Text style={styles.placeholderSub}>Aquí aparecerá el anuncio de AdSense</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ins
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
  placeholder: {
    marginVertical: 12,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#10464d',
    backgroundColor: '#e8f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  placeholderLabel: {
    color: '#10464d',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  placeholderSub: {
    color: '#4f6f74',
    fontSize: 11,
    marginTop: 4,
  },
});