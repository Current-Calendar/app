import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";
import EventFeedModal from "@/components/event-feed-modal";
import { API_CONFIG } from "@/constants/api";

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
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [calRes, evRes] = await Promise.all([
          fetch(API_CONFIG.endpoints.getCalendars),
          fetch(API_CONFIG.endpoints.getEvents),
        ]);

        if (!calRes.ok || !evRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const calData = await calRes.json();
        const evData = await evRes.json();

        const calendarMap: Record<number, any> = {};
        calData.forEach((c: any) => {
          calendarMap[c.id] = c;
        });

        const mappedEvents: Event[] = evData.map((e: any) => {
          const cal = calendarMap[e.calendarios?.[0]];
          return {
            id: String(e.id),
            title: e.titulo,
            description: e.descripcion || "",
            location: e.nombre_lugar || "",
            date: e.fecha,
            image: e.foto || "",
            username: cal?.creador_username || "unknown",
            userAvatar:
              "https://i.pravatar.cc/100?u=" + (cal?.creador_username || "unknown"),
            calendarId: String(e.calendarios?.[0] || ""),
            calendarName: cal?.nombre || "General",
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
  }, []);

  const handleOpenEvent = (id: string) => {
    const found = events.find((e) => e.id === id);
    if (!found) return;

    setSelectedEvent(found);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEvent(null);
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

        <EventFeedModal
          visible={modalVisible}
          onClose={handleCloseModal}
          event={selectedEvent}
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