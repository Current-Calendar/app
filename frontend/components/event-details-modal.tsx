import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BG = "#E8E5D8";
const TEXT = "#10464D";
const TEAL = "#1F6A6A";

type Props = {
  visible: boolean;
  onClose: () => void;
  event: any | null;
};

function formatDate(dateLike: any) {
  const s = String(dateLike ?? "");
  return s || "";
}

function formatTime(timeLike: any) {
  const s = String(timeLike ?? "");
  if (!s) return "";
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function formatDistanceKm(dist: any) {
  const n = Number(dist);
  if (!Number.isFinite(n)) return null;

  // 0 -> "0 km", 0.3 -> "0.3 km", 10.25 -> "10.3 km"
  const shown = n >= 10 ? n.toFixed(1) : n.toFixed(1);
  return `${shown} km`;
}

export default function EventDetailsModal({ visible, onClose, event }: Props) {
  if (!event) {
    return null;
  }

  const title = String(event?.title ?? "");
  const place = String(event?.place_name ?? "");
  const username = String(event?.creator_username ?? event?.creator?.username ?? "").trim();
  const description = String(event?.description ?? "").trim();

  const dateStr = formatDate(event?.date);
  const timeStr = formatTime(event?.time);
  const when = `${dateStr}${timeStr ? ` · ${timeStr}` : ""}`;

  const distanceKm = formatDistanceKm(event?.distance_km);

  if (__DEV__) {
    console.log("EVENT PHOTO:", event?.photo);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close X */}
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={18} color={TEXT} />
          </Pressable>

          {/* Image */}
          {event.photo ? (
            <View style={styles.coverWrap}>
              <Image
                source={{ uri: event.photo }}
                style={styles.cover}
                resizeMode="cover"
                onError={(e) => console.log("IMG ERROR:", event.photo, e?.nativeEvent)}
                onLoad={() => console.log("IMG OK:", event.photo)}
              />
            </View>
          ) : null}

          {/* Content */}
          <View style={styles.content}>
            {!!title && <Text style={styles.title}>{title}</Text>}

            {!!username && (
              <View style={styles.row}>
                <Ionicons name="person-outline" size={16} color={TEXT} />
                <Text style={styles.rowText}>@{username}</Text>
              </View>
            )}

            {!!place && (
              <View style={styles.row}>
                <Ionicons name="location-outline" size={16} color={TEXT} />
                <Text style={styles.rowText}>{place}</Text>
              </View>
            )}

            {/* Distance from user location */}
            {!!distanceKm && (
              <View style={styles.rowSub}>
                <Text style={styles.subText}>{distanceKm} away</Text>
              </View>
            )}

            {!!when.trim() && (
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color={TEXT} />
                <Text style={styles.rowText}>{when}</Text>
              </View>
            )}

            {/* Description */}
            {!!description && (
              <View style={styles.descWrap}>
                <Text style={styles.descTitle}>Description</Text>
                <Text style={styles.descText}>{description}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <Pressable onPress={onClose} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Close</Text>
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
  coverWrap: {
    width: "100%",
    height: 200,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
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

  // distance below location
  rowSub: {
    marginTop: -6,
    marginLeft: 26, // align with text (leaving space for the icon)
  },
  subText: {
    color: TEXT,
    opacity: 0.75,
    fontWeight: "800",
    fontSize: 13,
  },

  // description at the bottom
  descWrap: {
    marginTop: 4,
    paddingTop: 10,
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