import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "@/types/calendar";
import { eventCalendarCalendarCardStyles } from "@/styles/calendar-styles";
import { DefaultCalendarCover } from "@/components/default-calendar-cover";

interface CalendarCardProps {
  calendar: Calendar;
  onPress: (id: string) => void;
  onLike: (id: string) => void;
  onSubscribe: (id: string) => void;
  onComment: (id: string) => void;
  isSubscribed?: boolean;
}

export default function CalendarCard({
  calendar,
  onPress,
  onLike,
  onSubscribe,
  onComment,
  isSubscribed = false,
}: CalendarCardProps) {
  const privacyIcon: Record<string, any> = {
    PRIVATE: "lock-closed",
    FRIENDS: "people",
    PUBLIC: "globe",
  };

  const originIcon: Record<string, any> = {
    CURRENT: "calendar",
    GOOGLE: "logo-google",
    APPLE: "logo-apple",
  };

  const hasCalendarCover =
    typeof calendar.cover === "string" && calendar.cover.trim().length > 0;

  return (
    <Pressable
      style={eventCalendarCalendarCardStyles.card}
      onPress={() => onPress(calendar.id)}
    >
      {hasCalendarCover ? (
        <Image
          source={{ uri: calendar.cover!.trim() }}
          style={eventCalendarCalendarCardStyles.cover}
        />
      ) : (
        <DefaultCalendarCover
          style={eventCalendarCalendarCardStyles.cover}
          label="Calendario"
          iconSize={40}
        />
      )}

      <View style={eventCalendarCalendarCardStyles.content}>
        <View style={eventCalendarCalendarCardStyles.header}>
          <View style={eventCalendarCalendarCardStyles.titleSection}>
            <Text style={eventCalendarCalendarCardStyles.title}>{calendar.name}</Text>
            <Text style={eventCalendarCalendarCardStyles.creator}>by {calendar.creator}</Text>
          </View>
          <View style={eventCalendarCalendarCardStyles.badges}>
            <Ionicons
              name={privacyIcon[calendar.privacy] || "help"}
              size={16}
              color="#666"
              style={eventCalendarCalendarCardStyles.badge}
            />
            <Ionicons
              name={originIcon[calendar.origin] || "help"}
              size={16}
              color="#666"
            />
          </View>
        </View>

        <Text style={eventCalendarCalendarCardStyles.description} numberOfLines={2}>
          {calendar.description}
        </Text>

        <View style={eventCalendarCalendarCardStyles.footer}>
          <Pressable
            style={eventCalendarCalendarCardStyles.commentBtn}
            onPress={(e) => {
              e.stopPropagation();
              onComment(calendar.id);
            }}
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color="#10464d"
              style={eventCalendarCalendarCardStyles.btnIcon}
            />
            <Text style={eventCalendarCalendarCardStyles.commentBtnText}>
              Comment
            </Text>
          </Pressable>

          <Pressable
            style={eventCalendarCalendarCardStyles.likeBtn}
            onPress={(e) => {
              e.stopPropagation();
              onLike(calendar.id);
            }}
          >
            <Text style={eventCalendarCalendarCardStyles.likeBtnText}>{calendar.likes_count}</Text>
            <Ionicons
              name={calendar.liked_by_me ? "heart" : "heart-outline"}
              size={30}
              style={eventCalendarCalendarCardStyles.likeBtnIcon}
            />
          </Pressable>

          <Pressable
            style={[
              eventCalendarCalendarCardStyles.subscribeBtn,
              isSubscribed && eventCalendarCalendarCardStyles.subscribedBtn,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onSubscribe(calendar.id);
            }}
          >
            <Ionicons
              name={isSubscribed ? "checkmark-circle" : "add-circle"}
              size={18}
              color="#fff"
              style={eventCalendarCalendarCardStyles.btnIcon}
            />
            <Text style={eventCalendarCalendarCardStyles.subscribeBtnText}>
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}