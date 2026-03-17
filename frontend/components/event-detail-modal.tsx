import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '@/types/calendar';
import { useRouter } from 'expo-router';
import { useEventActions } from '@/hooks/use-event-actions';

const BG = "#E8E5D8";
const TEXT = "#10464D";
const TEAL = "#1F6A6A";
const RED = "#D64545";
const RED_DARK = "#B22222";

type AttendanceStatus = "pending" | "attending" | "not_attending";

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const router = useRouter();
  const { deleteEvent } = useEventActions();

  const [attendanceByEvent, setAttendanceByEvent] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(false);

  useEffect(() => {
    setAttendanceMenuOpen(false);
  }, [event]);

  if (!event) return null;

  const currentAttendance = attendanceByEvent[event.id] ?? "pending";

  const handleAttendanceChange = (value: AttendanceStatus) => {
    setAttendanceByEvent((prev) => ({
      ...prev,
      [event.id]: value,
    }));
    setAttendanceMenuOpen(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      onClose();
      router.replace('/calendars');
    } catch (error) {
      console.log('Error deleting event:', error);
    }
  };

  const getAttendanceLabel = (value: AttendanceStatus) => {
    switch (value) {
      case "pending":
        return "Pending";
      case "attending":
        return "I will attend";
      case "not_attending":
        return "I will not attend";
      default:
        return "Pending";
    }
  };

  return (
    <Modal visible={!!event} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { }}>
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

            <View style={styles.attendanceSection}>
              <Text style={styles.attendanceLabel}>Attendance</Text>

              <Pressable
                style={styles.attendanceButton}
                onPress={() => setAttendanceMenuOpen((prev) => !prev)}
              >
                <Text style={styles.attendanceButtonText}>
                  {getAttendanceLabel(currentAttendance)}
                </Text>
                <Ionicons
                  name={attendanceMenuOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={TEXT}
                />
              </Pressable>

              {attendanceMenuOpen && (
                <View style={styles.dropdown}>
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => handleAttendanceChange("attending")}
                  >
                    <Text style={styles.dropdownItemText}>I will attend</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => handleAttendanceChange("not_attending")}
                  >
                    <Text style={styles.dropdownItemText}>I will not attend</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {!!event.description && (
            <View style={styles.descWrap}>
              <Text style={styles.descTitle}>Description:</Text>
              <Text style={styles.descText}>{event.description}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                onClose();
                router.push({
                  pathname: "/edit_events",
                  params: { id: event.id },
                });
              }}
            >
              <Ionicons name="pencil" size={16} color="#EAF7F6" />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>

            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDeleteEvent(event.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
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
    overflow: "visible",
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
  },

  attendanceSection: {
    marginTop: 8,
    position: "relative",
    zIndex: 20,
  },

  attendanceLabel: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 14,
    marginBottom: 6,
  },

  attendanceButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(16,70,77,0.22)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  attendanceButtonText: {
    color: TEXT,
    fontWeight: "800",
    fontSize: 14,
  },

  dropdown: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(16,70,77,0.22)",
    overflow: "hidden",
  },

  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16,70,77,0.10)",
  },

  dropdownItemText: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 14,
  },

  descWrap: {
    marginTop: 12,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(16,70,77,0.14)",
  },

  descTitle: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 14,
    marginBottom: 4,
  },

  descText: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },

  editBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TEAL,
    borderWidth: 2,
    borderColor: "#0B3D3D",
  },

  editText: {
    color: "#EAF7F6",
    fontWeight: "900",
  },

  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: RED,
    borderWidth: 2,
    borderColor: RED_DARK,
  },

  deleteText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});