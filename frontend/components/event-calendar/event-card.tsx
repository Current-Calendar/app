import {
  View,
  Text,
  Image,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Event } from "@/app/(tabs)/switch-events";
import { eventCalendarEventCardStyles } from "@/styles/calendar-styles";

interface Props {
  event: Event;
  onOpen: (id: string) => void;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onSave: (id: string) => void;
  isSaved?: boolean;
}

export default function EventCard({
  event,
  onOpen,
  onLike,
  onComment,
  onSave,
  isSaved = false,
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
    <View style={eventCalendarEventCardStyles.card}>
      <View style={eventCalendarEventCardStyles.userRow}>
        <Image
          source={
            typeof event.userAvatar === 'string'
              ? { uri: event.userAvatar }
              : event.userAvatar
          }
          style={eventCalendarEventCardStyles.avatar}
        />
        <Text style={eventCalendarEventCardStyles.username}>{event.username}</Text>
      </View>

      <Pressable style={eventCalendarEventCardStyles.body} onPress={() => onOpen(event.id)}>
        <View
          style={[
            eventCalendarEventCardStyles.imageWrapper,
            { width: imageWidth, height: imageHeight },
          ]}
        >
          <Image source={{ uri: event.image }} style={eventCalendarEventCardStyles.image} />
        </View>

        <View style={eventCalendarEventCardStyles.content}>
          <Text style={eventCalendarEventCardStyles.title}>{event.title}</Text>

          <View style={eventCalendarEventCardStyles.calendarBadge}>
            <Ionicons name="calendar" size={14} color="#fff" />
            <Text style={eventCalendarEventCardStyles.calendarBadgeText}>{event.calendarName}</Text>
          </View>

          <Text
            style={eventCalendarEventCardStyles.description}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {event.description}
          </Text>

          <View style={eventCalendarEventCardStyles.metaRow}>
            <Ionicons name="calendar-outline" size={16} />
            <Text style={eventCalendarEventCardStyles.metaText}>{event.date}</Text>
          </View>

          <View style={eventCalendarEventCardStyles.metaRow}>
            <Ionicons name="location-outline" size={16} />
            <Text style={eventCalendarEventCardStyles.metaText}>{event.location}</Text>
          </View>
        </View>
      </Pressable>

      <View style={eventCalendarEventCardStyles.actions}>
        <Pressable style={eventCalendarEventCardStyles.actionButton} onPress={() => onLike(event.id)}>
          <Ionicons name="heart-outline" size={18} />
          {!isSmallScreen && (
            <Text style={eventCalendarEventCardStyles.actionText}>Like</Text>
          )}
        </Pressable>

        <Pressable style={eventCalendarEventCardStyles.actionButton} onPress={() => onComment(event.id)}>
          <Ionicons name="chatbubble-outline" size={18} />
          {!isSmallScreen && (
            <Text style={eventCalendarEventCardStyles.actionText}>Comment</Text>
          )}
        </Pressable>

        <Pressable style={eventCalendarEventCardStyles.actionButton} onPress={() => onSave(event.id)}>
          <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={18} />
          {!isSmallScreen && (
            <Text style={eventCalendarEventCardStyles.actionText}>{isSaved ? "Saved" : "Save"}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

