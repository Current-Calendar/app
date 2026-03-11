import { View, Pressable, Text } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { eventCalendarSwitchStyles } from "@/styles/calendar-styles";

export default function EventsCalendarSwitch() {
  const router = useRouter();
  const pathname = usePathname();

  const isEvents = pathname === "/switch-events";
  const isCalendar = pathname === "/switch-calendar";

  return (
    <View style={eventCalendarSwitchStyles.container}>
      <Pressable
        style={[eventCalendarSwitchStyles.button, isCalendar && eventCalendarSwitchStyles.activeButton]}
        onPress={() => router.push("/switch-calendar")}
      >
        <Text style={[eventCalendarSwitchStyles.text, isCalendar && eventCalendarSwitchStyles.activeText]}>
          Calendar
        </Text>
      </Pressable>
      <Pressable
        style={[eventCalendarSwitchStyles.button, isEvents && eventCalendarSwitchStyles.activeButton]}
        onPress={() => router.push("/switch-events")}
      >
        <Text style={[eventCalendarSwitchStyles.text, isEvents && eventCalendarSwitchStyles.activeText]}>
          Events
        </Text>
      </Pressable>
    </View>
  );
}

