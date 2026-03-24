import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { eventDetailsModalStyles } from "@/styles/calendar-styles";
import { DefaultCalendarCover } from "@/components/default-calendar-cover";

const TEXT = "#10464D";

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
  const hasPhoto = typeof event?.photo === "string" && event.photo.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={eventDetailsModalStyles.overlay} onPress={onClose}>
        <Pressable style={eventDetailsModalStyles.card} onPress={() => {}}>
          {/* Close X */}
          <Pressable onPress={onClose} style={eventDetailsModalStyles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={18} color={TEXT} />
          </Pressable>

          <View style={eventDetailsModalStyles.coverWrap}>
            {hasPhoto ? (
              <Image
                source={{ uri: event.photo.trim() }}
                style={eventDetailsModalStyles.cover}
                resizeMode="cover"
              />
            ) : (
              <DefaultCalendarCover
                style={eventDetailsModalStyles.cover}
                label="Event"
                iconSize={52}
              />
            )}
          </View>

          <View style={eventDetailsModalStyles.content}>
            {!!title && <Text style={eventDetailsModalStyles.title}>{title}</Text>}

            {!!username && (
              <View style={eventDetailsModalStyles.row}>
                <Ionicons name="person-outline" size={16} color={TEXT} />
                <Text style={eventDetailsModalStyles.rowText}>@{username}</Text>
              </View>
            )}

            {!!place && (
              <View style={eventDetailsModalStyles.row}>
                <Ionicons name="location-outline" size={16} color={TEXT} />
                <Text style={eventDetailsModalStyles.rowText}>{place}</Text>
              </View>
            )}

            {!!distanceKm && (
              <View style={eventDetailsModalStyles.rowSub}>
                <Text style={eventDetailsModalStyles.subText}>A {distanceKm} de ti</Text>
              </View>
            )}

            {!!when.trim() && (
              <View style={eventDetailsModalStyles.row}>
                <Ionicons name="calendar-outline" size={16} color={TEXT} />
                <Text style={eventDetailsModalStyles.rowText}>{when}</Text>
              </View>
            )}

            {!!description && (
              <View style={eventDetailsModalStyles.descWrap}>
                <Text style={eventDetailsModalStyles.descTitle}>Description</Text>
                <Text style={eventDetailsModalStyles.descText}>{description}</Text>
              </View>
            )}
          </View>

          <Pressable onPress={onClose} style={eventDetailsModalStyles.primaryBtn}>
            <Text style={eventDetailsModalStyles.primaryBtnText}>Cerrar</Text>
          </Pressable>
        </Pressable>
        </Pressable>
        </Modal>
  );
}

