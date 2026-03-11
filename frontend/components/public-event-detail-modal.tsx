import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CalendarEvent } from "@/types/calendar";

const BG = "#E8E5D8";
const TEXT = "#10464D";
const TEAL = "#1F6A6A";

interface PublicEventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

export function PublicEventDetailModal({
  event,
  onClose,
}: PublicEventDetailModalProps) {
  if (!event) return null;

  return (
    <Modal visible={!!event} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={18} color={TEXT} />
          </Pressable>

          <View style={styles.content}>
            <Text style={styles.title}>{event.title}</Text>

            {!!event.place_name && (
              <DetailRow icon="location-outline" label={event.place_name} />
            )}

            <DetailRow icon="calendar-outline" label={formatDate(event.date)} />

            {!!event.time && (
              <DetailRow icon="time-outline" label={event.time} />
            )}

            {!!event.location && (
              <DetailRow
                icon="navigate-outline"
                label={`${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`}
              />
            )}

            {!!event.recurrence && (
              <DetailRow icon="repeat-outline" label={event.recurrence} />
            )}
          </View>

          {!!event.description && (
            <View style={styles.descWrap}>
              <Text style={styles.descTitle}>Description:</Text>
              <Text style={styles.descText}>{event.description}</Text>
            </View>
          )}

          <Pressable onPress={onClose} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={TEXT} />
      <Text style={styles.rowText}>{label}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "92%",
    maxWidth: 520,
    backgroundColor: BG,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(16,70,77,0.22)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 5,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1.5,
    borderColor: "rgba(16,70,77,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  title: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 22,
    lineHeight: 26,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    color: TEXT,
    fontWeight: "800",
    fontSize: 15,
    flexShrink: 1,
  },
  descWrap: {
    marginTop: 12,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(16,70,77,0.14)",
    gap: 6,
  },
  descTitle: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 14,
  },
  descText: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  primaryBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TEAL,
    borderWidth: 2,
    borderColor: "#0B3D3D",
  },
  primaryBtnText: {
    color: "#EAF7F6",
    fontWeight: "900",
    fontSize: 16,
    textAlign: "center",
  },
});