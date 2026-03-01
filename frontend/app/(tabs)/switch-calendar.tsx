import { View, FlatList, StyleSheet } from "react-native";
import { useState } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import { Calendar } from "@/types/calendar";
import { MOCK_CALENDARS } from "@/constants/mock-data";

export default function CalendarsScreen() {

  /**
   * 🔹 Will be replaced by useQuery / fetch when backend connects
   */
  const [calendars] = useState<Calendar[]>(MOCK_CALENDARS);

  const handleOpenCalendar = (id: string) => {
    // Connect with calendar detail screen
    // router.push(`/calendars/${id}`);
  };

  const handleSubscribe = (id: string) => {
    console.log("Subscribe to calendar:", id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <EventsSwitch />

        <FlatList
          data={calendars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CalendarCard
              calendar={item}
              onPress={handleOpenCalendar}
              onSubscribe={handleSubscribe}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8E5D8",
    alignItems: "center",
  },
  inner: {
    width: "100%",
    maxWidth: 800,
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
});