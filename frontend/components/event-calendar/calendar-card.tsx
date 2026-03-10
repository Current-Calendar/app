import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "@/types/calendar";

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
    PRIVATE: "lock-closed",
    FRIENDS: "people",
    PUBLIC: "globe",
  };

  const originIcon: Record<string, any> = {
    CURRENT: "calendar",
    GOOGLE: "logo-google",
    APPLE: "logo-apple",
  };

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(calendar.id)}
    >
      {calendar.cover && (
        <Image
          source={{ uri: calendar.cover }}
          style={styles.cover}
        />
      )}

      <View
        style={[
          styles.coverFallback,
          !calendar.cover && styles.coverFallbackShown,
          { backgroundColor: calendar.color },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{calendar.name}</Text>
            <Text style={styles.creator}>by {calendar.creator}</Text>
          </View>
          <View style={styles.badges}>
            <Ionicons
              name={privacyIcon[calendar.privacy] || "help"}
              size={16}
              color="#666"
              style={styles.badge}
            />
            <Ionicons
              name={originIcon[calendar.origen] || "help"}
              size={16}
              color="#666"
            />
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {calendar.description}
        </Text>

        <View style={styles.footer}>
          <Pressable
            style={styles.subscribeBtn}
            onPress={() => onSubscribe(calendar.id)}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color="#fff"
              style={styles.btnIcon}
            />
            <Text style={styles.subscribeBtnText}>Subscribe</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cover: {
    width: "100%",
    height: 140,
  },
  coverFallback: {
    width: "100%",
    height: 140,
    display: "none",
  },
  coverFallbackShown: {
    display: "flex",
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  creator: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10464d",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnIcon: {
    marginRight: 4,
  },
  subscribeBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
