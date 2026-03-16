import { View, FlatList, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Text } from "react-native";
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
  time: string;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setErrorMessage(null);
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

        const calendars =
          (Array.isArray(calData) && calData) ||
          (Array.isArray(calData?.calendars) && calData.calendars) ||
          (Array.isArray(calData?.calendarios) && calData.calendarios) ||
          (Array.isArray(calData?.results) && calData.results) ||
          [];

        const eventsList =
          (Array.isArray(evData) && evData) ||
          (Array.isArray(evData?.events) && evData.events) ||
          (Array.isArray(evData?.eventos) && evData.eventos) ||
          (Array.isArray(evData?.results) && evData.results) ||
          [];

        const calendarMap: Record<number, any> = {};
        calendars.forEach((c: any) => {
          calendarMap[Number(c.id)] = c;
        });

        const resolveImageUrl = (rawUrl?: string) => {
          if (!rawUrl) return "https://picsum.photos/seed/event/640/360";
          if (/^https?:\/\//.test(rawUrl)) return rawUrl;
          const base = API_CONFIG.rootBaseURL || API_CONFIG.BaseURL;
          return `${(base || "").replace(/\/+$/, "")}/${String(rawUrl).replace(/^\/+/, "")}`;
        };

        const mappedEvents: Event[] = eventsList
          .map((e: any) => {
            const calendarIds = Array.isArray(e.calendars)
              ? e.calendars
              : Array.isArray(e.calendarios)
                ? e.calendarios
                : [];
            const firstCalendarId = calendarIds[0];
            const cal = firstCalendarId ? calendarMap[firstCalendarId] : undefined;

            return {
              id: String(e.id),
              title: e.title || e.titulo || "",
              description: e.description || e.descripcion || "",
              location: e.place_name || e.nombre_lugar || "",
              date: e.date || e.fecha || "",
              time: typeof (e.time || e.hora) === "string" ? String(e.time || e.hora).slice(0, 5) : "",
              image: resolveImageUrl(e.photo || e.foto),
              username: cal?.creator_username || cal?.creador_username || "unknown",
              userAvatar: "https://i.pravatar.cc/100?u=" + (cal?.creator_username || cal?.creador_username || "unknown"),
              calendarId: String(firstCalendarId || ""),
              calendarName: cal?.name || cal?.nombre || "General",
            };
          })
          .filter((evt: Event) => evt.id && evt.title);

        if (!cancelled) {
          setEvents(mappedEvents);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        if (!cancelled) {
          setEvents([]);
          setErrorMessage("Could not load events. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#10464d" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorTitle}>Could not load feed</Text>
        <Text style={styles.loadingText}>{errorMessage}</Text>
        <Text style={styles.retryLink} onPress={() => setReloadKey((k) => k + 1)}>
          Retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.authHeader}>
          <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/register')}
          >
            <Text style={styles.registerButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>


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
          ListEmptyComponent={<Text style={styles.emptyText}>No events to display.</Text>}
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

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8E5D8",
    alignItems: "center",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#E8E5D8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    color: "#10464d",
    opacity: 0.85,
    textAlign: "center",
    fontWeight: "600",
  },
  errorTitle: {
    color: "#c75146",
    fontWeight: "700",
    fontSize: 18,
    textAlign: "center",
  },
  retryLink: {
    marginTop: 12,
    color: "#10464d",
    fontWeight: "700",
    textDecorationLine: "underline",
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

  emptyText: {
    marginTop: 40,
    textAlign: "center",
    color: "#10464d",
    opacity: 0.8,
    fontWeight: "600",
  },

  authHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  loginButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#10464d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText:{
    color: '#10464d',
    fontWeight: '600',
    fontSize: 16,
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#10464d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButtonText:{
    color:'#FFFFFF',
    fontWeight:'600',
    fontSize: 16,
  },
});
