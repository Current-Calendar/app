import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Event } from "@/app/(tabs)/switch-events";

interface Props {
  event: Event;
  onOpen: (id: string) => void;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onSave: (id: string) => void;
}

export default function EventCard({
  event,
  onOpen,
  onLike,
  onComment,
  onSave,
}: Props) {
  const { width } = useWindowDimensions();

  const MAX_IMAGE_WIDTH = 220;
  const MIN_IMAGE_WIDTH = 100;
  const isSmallScreen = width < 400;

  const imageWidth = Math.min(
    MAX_IMAGE_WIDTH,
    Math.max(MIN_IMAGE_WIDTH, width * 0.28)
  );

  const imageHeight = imageWidth * 0.7;

  return (
    <View style={styles.card}>
      <View style={styles.userRow}>
        <Image source={{ uri: event.userAvatar }} style={styles.avatar} />
        <Text style={styles.username}>{event.username}</Text>
      </View>

      <Pressable style={styles.body} onPress={() => onOpen(event.id)}>
        <View
          style={[
            styles.imageWrapper,
            { width: imageWidth, height: imageHeight },
          ]}
        >
          <Image source={{ uri: event.image }} style={styles.image} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          <Text
            style={styles.description}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {event.description}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} />
            <Text style={styles.metaText}>{event.date}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => onLike(event.id)}>
          <Ionicons name="heart-outline" size={18} />
          {!isSmallScreen && (
            <Text style={styles.actionText}>Like</Text>
          )}
        </Pressable>

        <Pressable style={styles.actionButton} onPress={() => onComment(event.id)}>
          <Ionicons name="chatbubble-outline" size={18} />
          {!isSmallScreen && (
            <Text style={styles.actionText}>Comment</Text>
          )}
        </Pressable>

        <Pressable style={styles.actionButton} onPress={() => onSave(event.id)}>
          <Ionicons name="bookmark-outline" size={18} />
          {!isSmallScreen && (
            <Text style={styles.actionText}>Save</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f2f2f2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f4b6b6",
    padding: 20,
    marginBottom: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  username: {
    fontWeight: "600",
  },
  body: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 2,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  description: {
    color: "#555",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#333",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
  },
});