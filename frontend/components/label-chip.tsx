import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventLabel } from '@/types/calendar';

interface LabelChipProps {
  label: EventLabel;
  selected?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

export function LabelChip({
  label,
  selected = false,
  compact = false,
  disabled = false,
  onPress,
  onRemove,
}: LabelChipProps) {
  const content = (
    <View
      style={[
        styles.chip,
        compact && styles.compact,
        {
          borderColor: label.color,
          backgroundColor: selected ? label.color : 'transparent',
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: selected ? '#fff' : label.color }]} />
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          { color: selected ? '#fff' : '#0f4e4f' },
        ]}
        numberOfLines={1}
      >
        {label.name}
      </Text>
      {onRemove && !label.isDefault && (
        <Pressable hitSlop={8} onPress={onRemove} disabled={disabled} style={styles.removeBtn}>
          <Ionicons name="close" size={12} color={selected ? '#fff' : '#0f4e4f'} />
        </Pressable>
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
    backgroundColor: 'transparent',
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    fontWeight: '800',
    fontSize: 13,
  },
  textCompact: {
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    marginLeft: 2,
  },
});

