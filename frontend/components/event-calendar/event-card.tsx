import {
  View,
  Text,
  Image,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Event } from "@/app/(tabs)/switch-events";
import { eventCalendarEventCardStyles } from "@/styles/calendar-styles";
import { DefaultCalendarCover } from "@/components/default-calendar-cover";

interface Props {
  event: Event;
  onOpen: (id: string) => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
}

export default function EventCard({
  event,
  onOpen,
  onLike,
  onSave,
  onComment,
}: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const MAX_IMAGE_WIDTH = 220;
  const MIN_IMAGE_WIDTH = 100;
  const isSmallScreen = width < 400;

  const imageWidth = Math.min(
    MAX_IMAGE_WIDTH,
    Math.max(MIN_IMAGE_WIDTH, width * 0.28)
  );

  const imageHeight = imageWidth * 0.7;
  const hasEventImage =
    typeof event.image === "string" && event.image.trim().length > 0;

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
          {hasEventImage ? (
            <Image
              source={{ uri: event.image.trim() }}
              style={eventCalendarEventCardStyles.image}
            />
          ) : (
            <DefaultCalendarCover
              style={eventCalendarEventCardStyles.image}
              label="Evento"
              iconSize={24}
            />
          )}
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

          {Array.isArray(event.tags) && event.tags.length > 0 && (
          <View style={eventCalendarEventCardStyles.metaRow}>
            <Ionicons name="pricetags-outline" size={16} />

            <View style={eventCalendarEventCardStyles.tagsWrap}>
              {event.tags.map((tag) => (
                <View
                  key={String(tag.id)}
                  style={eventCalendarEventCardStyles.tagChip}
                >
                  <Text style={eventCalendarEventCardStyles.tagChipText}>
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

          <View style={eventCalendarEventCardStyles.metaRow}>
            <Ionicons name="location-outline" size={16} />
            <Text style={eventCalendarEventCardStyles.metaText}>{event.location}</Text>
          </View>
        </View>
      </Pressable>

      <View style={eventCalendarEventCardStyles.actions}>
        <Pressable style={eventCalendarEventCardStyles.actionButton} onPress={() => onLike(event.id)}>
          <Ionicons name={event.liked_by_me ? "heart" : "heart-outline"} size={18} />
          {!isSmallScreen && (
            <Text style={eventCalendarEventCardStyles.actionText}>
              {event.likes_count > 0 ? event.likes_count : "Like"}
            </Text>
          )}
        </Pressable>

        <Pressable style={eventCalendarEventCardStyles.actionButton} onPress={() => onComment(event.id)}>
          <Ionicons name="chatbubble-outline" size={18} />
          {!isSmallScreen && (
            <Text style={eventCalendarEventCardStyles.actionText}>Comment</Text>
          )}
        </Pressable>

        <Pressable style={eventCalendarEventCardStyles.actionButton} onPress={() => onSave(event.id)}>
          <Ionicons name={event.saved_by_me ? "bookmark" : "bookmark-outline"} size={18} />
          {!isSmallScreen && (
            <Text style={eventCalendarEventCardStyles.actionText}>Save</Text>
          )}
        </Pressable>

        <Pressable style={eventCalendarEventCardStyles.actionButton} onPress={() => router.push(`/chat/${event.id}` as any)}>
          <Ionicons name="chatbubbles-outline" size={18} />
          {!isSmallScreen && (
            <Text style={eventCalendarEventCardStyles.actionText}>Chat</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

