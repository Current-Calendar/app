import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";
import apiClient from "@/services/api-client";
import { useAuth } from "@/hooks/use-auth";

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
  const { isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [calData, evData] = await Promise.all([
          apiClient.get<any[]>("/recommendations/calendars/"),
          apiClient.get<any[]>("/recommendations/events/"),
        ]);

        // Map calendars for easy lookup
        const calendarMap: Record<number, any> = {};
        calData.forEach((c: any) => {
          calendarMap[Number(c.id)] = c;
        });

        const mappedEvents: Event[] = evData.map((e: any) => {
          const cal = calendarMap[e.calendars[0]];
          return {
            id: String(e.id),
            title: e.title,
            description: e.description || "",
            location: e.place_name || "",
            date: e.date,
            image: e.photo, // Placeholder for now
            username: cal?.creator_username || "unknown",
            userAvatar: "https://i.pravatar.cc/100?u=" + (cal?.creator_username || "unknown"),
            calendarId: String(e.calendars[0] || ""),
            calendarName: cal?.name || "General",
          };
        });

        setEvents(mappedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
        Alert.alert("Error", "Could not load events.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [authLoading]);

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