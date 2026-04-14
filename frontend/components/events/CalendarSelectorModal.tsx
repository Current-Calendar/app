import React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";

const TEXT = "#10464d";
const WHITE = "#FFFFFF";

export type CalendarItem = {
  id: string;
  name: string;
  image?: any;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  calendars: CalendarItem[];
  loading: boolean;
  onSelect: (calendar: CalendarItem) => void;
};

export default function CalendarSelectorModal({
  visible,
  onClose,
  calendars,
  loading,
  onSelect,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Select calendar</Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={TEXT} />
            </View>
          ) : (
            <FlatList
              data={calendars}
              keyExtractor={(i) => i.id}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.helperText}>
                  No calendars available. Create one first.
                </Text>
              }
            />
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "92%",
    maxWidth: 420,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
  },
  modalTitle: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 10,
  },
  modalSep: {
    height: 1,
    backgroundColor: "#eef3f3",
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  modalItemText: {
    color: TEXT,
    fontWeight: "600",
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: "#6b6b6b",
    textAlign: "center",
  },
  loadingWrap: {
    paddingVertical: 14,
  },
});
