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

export default function EventFeedModal({ visible, onClose, event }: Props) {
  if (!event) return null;

  const title = event.title?.trim() || "";
  const location = event.location?.trim() || "";
  const username = event.username?.trim() || "";
  const description = event.description?.trim() || "";
  const date = formatDate(event.date);
  const calendarName = event.calendarName?.trim() || "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
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
                <View style={styles.descWrap}>
                  <Text style={styles.descTitle}>Descripción</Text>
                  <Text style={styles.descText}>{description}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <Pressable onPress={onClose} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
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
    gap: 12,
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
  descWrap: {
    marginTop: 4,
    paddingTop: 12,
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
    lineHeight: 21,
    opacity: 0.9,
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