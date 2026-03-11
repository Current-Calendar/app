import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";
import { useCalendars } from "@/hooks/use-calendars";
import { useEventsList } from "@/hooks/use-events";

/**
 * 🔹 Tipo compartido con backend
 * Cuando backend conecte, este type debe alinearse con el DTO real
 */
export interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  date: string;
  image: string;
  username: string;
  userAvatar: string;
  calendarId: string;
  calendarName: string;
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const {
    calendars: backendCalendars,
    error: calendarsError,
  } = useCalendars();

  const {
    events: backendEvents,
    loading: loadingEvents,
    error: eventsError,
  } = useEventsList();

  useEffect(() => {
    if (calendarsError || eventsError) {
      console.error("Error fetching events:", calendarsError || eventsError);
      Alert.alert("Error", "Could not load events.");
    }
  }, [calendarsError, eventsError]);

  useEffect(() => {
    // Map calendars for easy lookup
    const calendarMap: Record<number, any> = {};
    backendCalendars.forEach((c: any) => {
      calendarMap[Number(c.id)] = c;
    });

    const mappedEvents: Event[] = backendEvents.map((e: any) => {
      const cal = calendarMap[e.calendars[0]];
      return {
        id: String(e.id),
        title: e.title,
        description: e.description || "",
        location: e.place_name || "",
        date: e.date,
        image: e.photo,
        username: cal?.creator_username || "unknown",
        userAvatar: "https://i.pravatar.cc/100?u=" + (cal?.creator_username || "unknown"),
        calendarId: String(e.calendars[0] || ""),
        calendarName: cal?.name || "General",
      };
    });

    setEvents(mappedEvents);
  }, [backendCalendars, backendEvents]);

  const handleOpenEvent = (id: string) => {
    // Conectar con show de events
    //router.push(`/events/${id}`);
  };

  const handleLike = (id: string) => {
    console.log("Like:", id);
  };

  const handleComment = (id: string) => {
    console.log("Comment:", id);
  };

  const handleSave = (id: string) => {
    console.log("Save:", id);
  };

  const loading = loadingEvents;
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#10464d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <EventsSwitch />

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onOpen={handleOpenEvent}
              onLike={handleLike}
              onComment={handleComment}
              onSave={handleSave}
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