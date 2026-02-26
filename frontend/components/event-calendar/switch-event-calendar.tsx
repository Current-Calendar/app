import { View, Pressable, Text, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";

export default function EventsCalendarSwitch() {
  const router = useRouter();
  const pathname = usePathname();

  const isEvents = pathname === "/switch-events";
  const isCalendar = pathname === "/switch-calendar";

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isEvents && styles.activeButton]}
        onPress={() => router.push("/switch-events")}
      >
        <Text style={[styles.text, isEvents && styles.activeText]}>
          Events
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, isCalendar && styles.activeButton]}
        onPress={() => router.push("/switch-calendar")}
      >
        <Text style={[styles.text, isCalendar && styles.activeText]}>
          Calendar
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#1b5b60",
    borderRadius: 25,
    alignSelf: "center",
    marginVertical: 16,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  activeButton: {
    backgroundColor: "#ffffff",
  },
  text: {
    color: "#ffffff",
    fontWeight: "600",
  },
  activeText: {
    color: "#1b5b60",
  },
});