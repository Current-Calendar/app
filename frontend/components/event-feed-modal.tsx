import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BG = "#E8E5D8";
const TEXT = "#10464D";
const TEAL = "#1F6A6A";

export type FeedEventAttendee = {
  id: string;
  name: string;
  // Backend should provide the attendance response datetime here.
  // Expected format: ISO string, e.g. "2026-03-17T18:42:00Z"
  respondedAt: string;
  avatar?: string;
};

export type FeedEvent = {
  id: string;
  title: string;
  description?: string;
  location: string;
  date: string;
  image?: string;
  username: string;
  userAvatar?: string;
  calendarId: string;
  calendarName: string;
  // List of users who marked this event as attending.
  attendees?: FeedEventAttendee[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  event: FeedEvent | null;
};

function formatDate(dateLike?: string) {
  if (!dateLike) return "";
  return String(dateLike);
}

function formatResponseDateTime(dateLike?: string) {
  if (!dateLike) return "";

  const parsed = new Date(dateLike);

  if (!Number.isNaN(parsed.getTime())) {
    // Frontend expects backend to send a valid datetime string.
    return parsed.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return String(dateLike);
}

export default function EventFeedModal({ visible, onClose, event }: Props) {
  if (!event) return null;

  const title = event.title?.trim() || "";
  const location = event.location?.trim() || "";
  const username = event.username?.trim() || "";
  const description = event.description?.trim() || "";
  const date = formatDate(event.date);
  const calendarName = event.calendarName?.trim() || "";
  const attendees = event.attendees ?? [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { }}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={18} color={TEXT} />
          </Pressable>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {!!event.image && (
              <View style={styles.coverWrap}>
                <Image
                  source={{ uri: event.image }}
                  style={styles.cover}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.content}>
              {!!title && <Text style={styles.title}>{title}</Text>}

              <View style={styles.authorRow}>
                {!!event.userAvatar ? (
                  <Image
                    source={{ uri: event.userAvatar }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={16} color={TEXT} />
                  </View>
                )}

                <Text style={styles.username}>@{username || "unknown"}</Text>
              </View>

              {!!calendarName && (
                <View style={styles.badge}>
                  <Ionicons name="calendar-outline" size={14} color="#EAF7F6" />
                  <Text style={styles.badgeText}>{calendarName}</Text>
                </View>
              )}

              {!!date && (
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={16} color={TEXT} />
                  <Text style={styles.rowText}>{date}</Text>
                </View>
              )}

              {!!location && (
                <View style={styles.row}>
                  <Ionicons name="location-outline" size={16} color={TEXT} />
                  <Text style={styles.rowText}>{location}</Text>
                </View>
              )}

              {!!description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descText}>{description}</Text>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Attending</Text>
                  <Text style={styles.sectionCount}>
                    {attendees.length} {attendees.length === 1 ? "person" : "people"}
                  </Text>
                </View>

                {attendees.length > 0 ? (
                  <View style={styles.attendeesList}>
                    {attendees.map((person) => (
                      <View key={person.id} style={styles.attendeeRow}>
                        <View style={styles.attendeeLeft}>
                          {!!person.avatar ? (
                            <Image
                              source={{ uri: person.avatar }}
                              style={styles.attendeeAvatar}
                            />
                          ) : (
                            <View style={styles.attendeeAvatarFallback}>
                              <Ionicons name="person" size={14} color={TEXT} />
                            </View>
                          )}

                          <Text style={styles.attendeeName}>{person.name}</Text>
                        </View>

                        <View style={styles.timeBadge}>
                          <Ionicons name="time-outline" size={13} color={TEXT} />
                          <Text style={styles.attendeeTime}>
                            {formatResponseDateTime(person.respondedAt)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyAttendeesText}>
                    No attendees confirmed yet.
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          <Pressable onPress={onClose} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
    maxWidth: 560,
    maxHeight: "88%",
    backgroundColor: BG,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(16,70,77,0.18)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(16,70,77,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingBottom: 10,
  },

  coverWrap: {
    width: "100%",
    height: 220,
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  cover: {
    width: "100%",
    height: "100%",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 14,
  },

  title: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 24,
    lineHeight: 30,
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(16,70,77,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  username: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },

  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10464D",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeText: {
    color: "#EAF7F6",
    fontSize: 13,
    fontWeight: "800",
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  rowText: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },

  section: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(16,70,77,0.14)",
    gap: 10,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  sectionTitle: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 14,
  },

  sectionCount: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 13,
    fontWeight: "700",
  },

  descText: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.9,
  },

  attendeesList: {
    gap: 10,
  },

  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 2,
  },

  attendeeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  attendeeAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  attendeeAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(16,70,77,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  attendeeName: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 14,
    flexShrink: 1,
  },

  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16,70,77,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  attendeeTime: {
    color: TEXT,
    opacity: 0.8,
    fontWeight: "700",
    fontSize: 12,
  },

  emptyAttendeesText: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 14,
    fontWeight: "600",
  },

  primaryBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
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