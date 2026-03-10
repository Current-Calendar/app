import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "@/types/calendar";
import { eventCalendarCalendarCardStyles } from "@/styles/calendar-styles";

interface CalendarCardProps {
  calendar: Calendar;
  onPress: (id: string) => void;
  onSubscribe: (id: string) => void;
}

export default function CalendarCard({
  calendar,
  onPress,
  onSubscribe,
}: CalendarCardProps) {
  const privacyIcon: Record<string, any> = {
    PRIVADO: "lock-closed",
    AMIGOS: "people",
    PUBLICO: "globe",
  };

  const originIcon: Record<string, any> = {
    CURRENT: "calendar",
    GOOGLE: "logo-google",
    APPLE: "logo-apple",
  };

  return (
    <Pressable
      style={eventCalendarCalendarCardStyles.card}
      onPress={() => onPress(calendar.id)}
    >
      {calendar.portada && (
        <Image
          source={{ uri: calendar.portada }}
          style={eventCalendarCalendarCardStyles.cover}
        />
      )}

      <View
        style={[
          eventCalendarCalendarCardStyles.coverFallback,
          !calendar.portada && eventCalendarCalendarCardStyles.coverFallbackShown,
          { backgroundColor: calendar.color },
        ]}
      />

      <View style={eventCalendarCalendarCardStyles.content}>
        <View style={eventCalendarCalendarCardStyles.header}>
          <View style={eventCalendarCalendarCardStyles.titleSection}>
            <Text style={eventCalendarCalendarCardStyles.title}>{calendar.nombre}</Text>
            <Text style={eventCalendarCalendarCardStyles.creator}>by {calendar.creador}</Text>
          </View>
          <View style={eventCalendarCalendarCardStyles.badges}>
            <Ionicons
              name={privacyIcon[calendar.estado] || "help"}
              size={16}
              color="#666"
              style={eventCalendarCalendarCardStyles.badge}
            />
            <Ionicons
              name={originIcon[calendar.origen] || "help"}
              size={16}
              color="#666"
            />
          </View>
        </View>

        <Text style={eventCalendarCalendarCardStyles.description} numberOfLines={2}>
          {calendar.descripcion}
        </Text>

        <View style={eventCalendarCalendarCardStyles.footer}>
          <Pressable
            style={eventCalendarCalendarCardStyles.subscribeBtn}
            onPress={() => onSubscribe(calendar.id)}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color="#fff"
              style={eventCalendarCalendarCardStyles.btnIcon}
            />
            <Text style={eventCalendarCalendarCardStyles.subscribeBtnText}>Subscribe</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

