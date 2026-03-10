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

  const dateStr = formatDate(event?.fecha);
  const timeStr = formatTime(event?.hora);
  const when = `${dateStr}${timeStr ? ` Â· ${timeStr}` : ""}`;

  const distanceKm = formatDistanceKm(event?.distance_km);

  if (__DEV__) {
    console.log("EVENT PHOTO:", event?.photo);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={eventDetailsModalStyles.overlay}>
        <View style={eventDetailsModalStyles.card}>
          <Pressable onPress={onClose} style={eventDetailsModalStyles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={18} color={TEXT} />
          </Pressable>

          {event.foto ? (
            <View style={eventDetailsModalStyles.coverWrap}>
              <Image
                source={{ uri: event.foto }}
                style={eventDetailsModalStyles.cover}
                resizeMode="cover"
                onError={(e) => console.log("IMG ERROR:", event.photo, e?.nativeEvent)}
                onLoad={() => console.log("IMG OK:", event.photo)}
              />
            </View>
          ) : null}

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
                <Text style={eventDetailsModalStyles.descTitle}>DescripciÃ³n</Text>
                <Text style={eventDetailsModalStyles.descText}>{description}</Text>
              </View>
            )}
          </View>

          <Pressable onPress={onClose} style={eventDetailsModalStyles.primaryBtn}>
            <Text style={eventDetailsModalStyles.primaryBtnText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

