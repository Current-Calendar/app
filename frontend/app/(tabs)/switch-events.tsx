import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";
import apiClient from "@/services/api-client";
import { API_CONFIG } from "@/constants/api";

const AVATAR_COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB84C', '#FF9F43', '#00CFE8', '#10464d', '#eb8c85'];

function colorForUsername(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * 🔹 Tipo compartido con backend
 */
export interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  date: string;
  image: string;
  username: string;
  userAvatar: string | null;
  avatarColor: string;
  calendarId: string;
  calendarName: string;
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [calData, evData] = await Promise.all([
          apiClient.get<any[]>(API_CONFIG.endpoints.getCalendars.replace(API_CONFIG.BaseURL, '')),
          apiClient.get<any[]>(API_CONFIG.endpoints.getEvents.replace(API_CONFIG.BaseURL, '')),
        ]);

        // Map calendars for easy lookup
        const calendarMap: Record<number, any> = {};
        calData.forEach((c: any) => { calendarMap[c.id] = c; });

        const mappedEvents: Event[] = evData.map((e: any) => {
          const cal = calendarMap[e.calendarios[0]];
          const username = e.creador_username || cal?.creador_username || 'unknown';
          return {
            id: String(e.id),
            title: e.titulo,
            description: e.descripcion || '',
            location: e.nombre_lugar || '',
            date: e.fecha,
            image: e.foto || '',
            username,
            userAvatar: e.creador_foto || null,
            avatarColor: colorForUsername(username),
            calendarId: String(e.calendarios[0] || ''),
            calendarName: cal?.nombre || 'General',
          };
        });

        setEvents(mappedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        Alert.alert('Error', 'Could not load events.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

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