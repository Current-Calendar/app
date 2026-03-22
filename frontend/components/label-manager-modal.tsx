import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EventLabel } from '@/types/calendar';
import { LabelChip } from './label-chip';

interface LabelManagerModalProps {
  visible: boolean;
  labels: EventLabel[];
  customLabels: EventLabel[];
  palette: string[];
  onCreate: (name: string, color: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  busy?: boolean;
}

export function LabelManagerModal({
  visible,
  labels,
  customLabels,
  palette,
  onCreate,
  onDelete,
  onClose,
  busy = false,
}: LabelManagerModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(palette[0] ?? '#10464D');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setColor(palette[0] ?? '#10464D');
    setError(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Intorudce a name for the label.');
      return;
    }
    onCreate(name.trim(), color);
    resetForm();
  };

  const defaultLabels = useMemo(() => labels.filter((l) => l.isDefault), [labels]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Labels</Text>
          <Text style={styles.subtitle}>
            Use default labels or create your own.
          </Text>

          <Text style={styles.sectionLabel}>Defaults</Text>
          <View style={styles.row}>
            {defaultLabels.map((label) => (
              <LabelChip key={label.id} label={label} compact />
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Own loabels</Text>
          <View style={styles.row}>
            {customLabels.length === 0 && (
              <Text style={styles.helper}>You have no custom labels.</Text>
            )}
            {customLabels.map((label) => (
              <LabelChip
                key={label.id}
                label={label}
                compact
                onRemove={() => onDelete(label.id)}
              />
            ))}
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Create label</Text>
            <TextInput
              placeholder="Name"
              placeholderTextColor="rgba(16,70,77,0.45)"
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null);
              }}
            />

            <View style={styles.paletteRow}>
              {palette.map((c) => {
                const selected = c === color;
                return (
                  <Pressable
                    key={c}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      selected && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setColor(c)}
                  />
                );
              })}
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.saveBtn} onPress={handleSave} disabled={busy}>
              {busy ? <ActivityIndicator color="#EAF7F6" /> : <Text style={styles.saveText}>Save</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '92%',
    maxWidth: 520,
    backgroundColor: '#E8E5D8',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(16,70,77,0.2)',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10464D',
  },
  subtitle: {
    color: '#10464D',
    opacity: 0.75,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontWeight: '800',
    color: '#10464D',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helper: {
    color: '#10464D',
    opacity: 0.7,
  },
  form: {
    marginTop: 12,
  },
  input: {
    height: 42,
    borderWidth: 2,
    borderColor: '#F2A3A6',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorSwatchSelected: {
    borderColor: '#0B3D3D',
    borderWidth: 2,
  },
  error: {
    color: '#D64545',
    fontWeight: '700',
    marginBottom: 6,
  },
  saveBtn: {
    marginTop: 6,
    backgroundColor: '#1F6A6A',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0B3D3D',
  },
  saveText: {
    color: '#EAF7F6',
    fontWeight: '900',
  },
});

