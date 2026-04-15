import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '@/types/calendar';
import { useRouter } from 'expo-router';
import { useEventActions } from '@/hooks/use-event-actions';
import CommentsModal from "./comments-modal";
import { DefaultCalendarCover } from '@/components/default-calendar-cover';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import InviteUserModal from "./InviteUserModal";
import apiClient from '@/services/api-client';
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG = "#FFFDED";
const TEXT = "#10464D";
const TEAL = "#1F6A6A";
const RED = "#D64545";
const RED_DARK = "#B22222";

type AttendanceStatus = "ASSISTING" | "NOT_ASSISTING" | "PENDING";

type EventTagItem = {
  id: number | string;
  name: string;
  category?: number | string;
  category_name?: string;
};

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  canManageActions?: boolean;
}

export function EventDetailModal({
  event,
  onClose,
  canManageActions = false,
}: EventDetailModalProps) {
  const router = useRouter();
  const { deleteEvent } = useEventActions();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isNarrow = width < 420;

  const [attendanceByEvent, setAttendanceByEvent] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);

  const [eventTags, setEventTags] = useState<EventTagItem[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    setAttendanceMenuOpen(false);
    setCommentsVisible(false);
    setDeleteConfirmVisible(false);
    setDeletingEvent(false);
    setInviteVisible(false);
  }, [event]);

  const normalizeAttendanceStatus = (value?: string | null): AttendanceStatus => {
    if (value === "ASSISTING" || value === "NOT_ASSISTING") {
      return value;
    }
    return "PENDING";
  };

  useEffect(() => {
    if (!event?.id) return;

    const initialStatus = normalizeAttendanceStatus((event as any).my_attendance_status);
    if (initialStatus === "PENDING") return;

    setAttendanceByEvent((prev) => {
      if (prev[event.id]) return prev;
      return { ...prev, [event.id]: initialStatus };
    });
  }, [event]);

  useEffect(() => {
    const loadEventTags = async () => {
      if (!event?.id) {
        setEventTags([]);
        return;
      }

      try {
        setTagsLoading(true);

        const response: any = await apiClient.get(`/event-tags/for-event/${event.id}/`);

        const tags =
          (Array.isArray(response) && response) ||
          (Array.isArray(response?.results) && response.results) ||
          (Array.isArray(response?.data) && response.data) ||
          [];

        setEventTags(tags);
      } catch (error) {
        console.error("Error loading event tags:", error);
        setEventTags([]);
      } finally {
        setTagsLoading(false);
      }
    };

    void loadEventTags();
  }, [event?.id]);

  if (!event) return null;

  const eventImageRaw =
    typeof (event as any).photo === "string" && (event as any).photo.trim().length > 0
      ? (event as any).photo.trim()
      : typeof (event as any).image === "string" && (event as any).image.trim().length > 0
        ? (event as any).image.trim()
        : "";

  const hasEventImage = eventImageRaw.length > 0;
  const currentAttendance =
    attendanceByEvent[event.id] ?? normalizeAttendanceStatus((event as any).my_attendance_status);

  const handleAttendanceChange = async (value: AttendanceStatus) => {
    setAttendanceMenuOpen(false);
    setAttendanceLoading(true);
    try {
      const response: any = await apiClient.patch(`/events/${event.id}/rsvp/`, { status: value });
      const nextStatus = normalizeAttendanceStatus(response?.status || value);
      setAttendanceByEvent((prev) => ({ ...prev, [event.id]: nextStatus }));
    } catch (error) {
      console.error("Error updating attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || deletingEvent) return;

    try {
      setDeletingEvent(true);
      await deleteEvent(event.id);
      setDeleteConfirmVisible(false);
      onClose();
      router.replace('/calendars');
    } catch (error) {
      console.log('Error deleting event:', error);
    } finally {
      setDeletingEvent(false);
    }
  };

  const getAttendanceLabel = (value: AttendanceStatus) => {
    switch (value) {
      case "ASSISTING":
        return "I will attend";
      case "NOT_ASSISTING":
        return "I will not attend";
      default:
        return "Pending";
    }
  };

  const handleOpenComments = () => {
    setCommentsVisible(true);
  };

  const handleCloseComments = () => {
    setCommentsVisible(false);
  };

  return (
    <>
      <Modal visible={!!event} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[styles.card, { paddingBottom: 12 + insets.bottom }]}
            onPress={() => {}}
          >
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={18} color={TEXT} />
            </Pressable>

            {hasEventImage ? (
              <Image
                source={{ uri: eventImageRaw }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <DefaultCalendarCover
                style={{...styles.image, backgroundColor: event.color}}
                label="Evento"
                iconSize={52}
              />
            )}

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

              {tagsLoading ? (
                <View style={styles.tagsLoadingRow}>
                  <ActivityIndicator size="small" color={TEXT} />
                </View>
              ) : Array.isArray(eventTags) && eventTags.length > 0 ? (
                <View style={styles.metaRow}>
                  <Ionicons
                    name="pricetags-outline"
                    size={16}
                    color={TEXT}
                    style={styles.metaRowIcon}
                  />
                  <View style={styles.tagsWrap}>
                    {eventTags.map((tag) => (
                      <View key={String(tag.id)} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>{tag.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.attendanceSection}>
                <Text style={styles.attendanceLabel}>Attendance</Text>

                <Pressable
                  style={[styles.attendanceButton, attendanceLoading && { opacity: 0.6 }]}
                  onPress={() => !attendanceLoading && setAttendanceMenuOpen((prev) => !prev)}
                  testID="event-attendance-button"
                >
                  <Text style={styles.attendanceButtonText} testID="event-attendance-label">
                    {attendanceLoading ? "Saving..." : getAttendanceLabel(currentAttendance)}
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
                      onPress={() => handleAttendanceChange("ASSISTING")}
                      testID="event-attendance-assisting-option"
                    >
                      <Text style={styles.dropdownItemText}>I will attend</Text>
                    </Pressable>

                    <Pressable
                      style={styles.dropdownItem}
                      onPress={() => handleAttendanceChange("NOT_ASSISTING")}
                      testID="event-attendance-not-assisting-option"
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

            <View style={[styles.actions, isNarrow && styles.actionsStack]}>
              <Pressable
                style={[styles.commentBtn, isNarrow && styles.actionFullWidth]}
                onPress={handleOpenComments}
              >
                <Ionicons name="chatbubble-outline" size={16} color={TEXT} />
                <Text style={styles.commentText}>Comments</Text>
              </Pressable>

              {canManageActions && (
                <>
                  <Pressable
                    style={[styles.inviteBtn, isNarrow && styles.actionFullWidth]}
                    onPress={() => setInviteVisible(true)}
                  >
                    <Ionicons name="person-add-outline" size={16} color={TEXT} />
                    <Text style={styles.inviteText}>Invite</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.editBtn, isNarrow && styles.actionFullWidth]}
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
                    style={[
                      styles.deleteBtn,
                      deletingEvent && styles.deleteBtnDisabled,
                      isNarrow && styles.actionFullWidth,
                    ]}
                    onPress={() => setDeleteConfirmVisible(true)}
                    disabled={deletingEvent}
                  >
                    {deletingEvent ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.deleteText}>
                      {deletingEvent ? "Deleting..." : "Delete"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CommentsModal
        visible={commentsVisible}
        onClose={handleCloseComments}
        event={{
          id: event.id,
          title: event.title,
          image: (event as any).photo || (event as any).image || "",
          username: "",
          userAvatar: "",
        }}
      />

      <ConfirmDeleteModal
        visible={deleteConfirmVisible}
        title="Delete event"
        message={`Are you sure you want to delete "${event.title}"? This action cannot be undone.`}
        loading={deletingEvent}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          void handleDeleteEvent();
        }}
      />

      <InviteUserModal
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        itemId={event.id}
        type="event"
      />
    </>
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
    maxWidth: 640,
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
  actionsStack: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  commentBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "rgba(16,70,77,0.22)",
  },

  commentText: {
    color: TEXT,
    fontWeight: "900",
  },

  inviteBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "rgba(16,70,77,0.22)",
  },

  inviteText: {
    color: TEXT,
    fontWeight: "900",
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

  deleteBtnDisabled: {
    opacity: 0.7,
  },

  deleteText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  actionFullWidth: {
    width: "100%",
    flex: 0,
  },

  image: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginBottom: 12,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
  },

  metaRowIcon: {
    marginTop: 4,
  },

  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginLeft: 8,
    flex: 1,
  },

  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#E8F2F2",
    borderWidth: 1,
    borderColor: "#CFE3E3",
  },

  tagChipText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
  },

  tagsLoadingRow: {
    paddingTop: 2,
    paddingBottom: 2,
    alignItems: "flex-start",
  },
});