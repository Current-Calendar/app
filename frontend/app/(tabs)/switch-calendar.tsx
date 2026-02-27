import { View, Text, StyleSheet } from "react-native";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <EventsSwitch />

      <View style={styles.content}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>
          Calendar screen coming soon...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8E5D8",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#666",
  },
});