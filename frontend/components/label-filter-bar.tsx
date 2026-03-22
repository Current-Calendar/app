import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { EventLabel } from '@/types/calendar';
import { LabelChip } from './label-chip';

interface LabelFilterBarProps {
  labels: EventLabel[];
  selected: string | null;
  onChange: (id: string | null) => void;
  onManage?: () => void;
}

export function LabelFilterBar({ labels, selected, onChange, onManage }: LabelFilterBarProps) {
  const handleSelect = (id: string | null) => onChange(id === selected ? null : id);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        <LabelChip
          label={{ id: '__all__', name: 'All labels', color: '#10464D' }}
          selected={selected === null}
          compact
          onPress={() => onChange(null)}
        />
        {labels.map((label) => (
          <LabelChip
            key={label.id}
            label={label}
            selected={selected === label.id}
            compact
            onPress={() => handleSelect(label.id)}
          />
        ))}
        {onManage && (
          <View style={styles.manageGap}>
            <LabelChip
              label={{ id: 'manage', name: 'Manage', color: '#1F6A6A' }}
              compact
              onPress={onManage}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
  },
  strip: {
    gap: 8,
    paddingRight: 12,
  },
  manageGap: {
    marginLeft: 6,
  },
});

