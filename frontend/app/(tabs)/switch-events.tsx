import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Text, ImageSourcePropType, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";
import EventFeedModal, { FeedEvent } from "@/components/event-feed-modal";
import { useCalendars } from "@/hooks/use-calendars";
import { useEventsList } from "@/hooks/use-events";
import CommentsModal from "@/components/comments-modal";
import { useAuth } from "@/hooks/use-auth";
import { API_CONFIG } from "@/constants/api";
import InvitationsModal from "@/components/InvitationsModal";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "@/services/api-client";

export interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  date: string;
  time: string;
  image: string;
  username: string;
  userAvatar: string | ImageSourcePropType;
  calendarId: string;
  calendarName: string;
  attendees?: {
    id: string;
    name: string;
    respondedAt: string;
    avatar?: string;
  }[];
}

export default function EventsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const hasSession = isAuthenticated || Boolean(user);

  

  // Hooks de datos (HEAD)
  const { calendars: backendCalendars, error: calendarsError } = useCalendars();
  const { events: backendEvents, loading: loadingEvents, error: eventsError, refetch } = useEventsList();

  // Estados de UI (main)
  const [events, setEvents] = useState<Event[]>([]);
  const [subscribedCalendarIds, setSubscribedCalendarIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [invitationsVisible, setInvitationsVisible] = useState(false);

  // Helper para resolver URLs de imágenes (Lógica de main)
  const resolveImageUrl = (rawUrl?: string) => {
    if (!rawUrl) return "https://picsum.photos/seed/event/640/360";
    if (/^https?:\/\//.test(rawUrl)) return rawUrl;
    const base = API_CONFIG.rootBaseURL || API_CONFIG.BaseURL;
    return `${(base || "").replace(/\/+$/, "")}/${String(rawUrl).replace(/^\/+/, "")}`;
  };

  useEffect(() => {
    const fetchSubscribedCalendars = async () => {
      if (!hasSession) {
        setSubscribedCalendarIds([]);
        return;
      }

      try {
        const subscribedData = await apiClient.get<any[]>("/calendars/subscribed/");
        const dataArray = Array.isArray(subscribedData)
          ? subscribedData
          : (subscribedData as any)?.data || [];

        setSubscribedCalendarIds(dataArray.map((c: any) => String(c.id)));
      } catch (error) {
        console.error("Error fetching subscribed calendars for events feed:", error);
        setSubscribedCalendarIds([]);
      }
    };

    void fetchSubscribedCalendars();
  }, [hasSession]);

  // Mapeo y transformación de datos
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

        const mappedEvents: Event[] = evData.map((e: any, index: number) => {
          const cal = calendarMap[e.calendars[0]];
          return {
            id: String(e.id),
            title: e.title || e.titulo || "",
            description: e.description || e.descripcion || "",
            location: e.place_name || e.nombre_lugar || "",
            date: e.date || e.fecha || "",
            time: typeof (e.time || e.hora) === "string" ? String(e.time || e.hora).slice(0, 5) : "",
            image: resolveImageUrl(e.photo || e.foto),
            username: cal?.creator_username || "unknown",
            userAvatar: "https://i.pravatar.cc/100?u=" + (cal?.creator_username || "unknown"),
            calendarId: String(e.calendars[0] || ""),
            calendarName: cal?.name || "General",
            // Temporary mock attendees for frontend testing.
            // Backend should replace this with real attendees data per event.
            attendees: index % 2 === 0
              ? [
                {
                  id: "1",
                  name: "Rocío",
                  respondedAt: "2026-03-17T18:42:00Z",
                  avatar: "https://i.pravatar.cc/100?u=rocio",
                },
                {
                  id: "2",
                  name: "Lucía",
                  respondedAt: "2026-03-17T19:05:00Z",
                  avatar: "https://i.pravatar.cc/100?u=lucia",
                },
              ]
              : [],
          };
        }).filter((evt: Event) => evt.id && evt.title);

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
  // Manejo de errores
  const errorMessage = calendarsError || eventsError;

  // Handlers de UI
  const handleOpenEvent = (id: string) => {
    const found = events.find((e) => e.id === id);
    if (found) {
      setSelectedEvent(found);
      setModalVisible(true);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEvent(null);
  };

  // Vistas de estado (Loading / Error)
  if (loadingEvents && events.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#10464d" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  if (errorMessage && events.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorTitle}>Could not load feed</Text>
        <Text style={styles.loadingText}>{errorMessage.message}</Text>
        <TouchableOpacity onPress={() => refetch?.()}>
          <Text style={styles.retryLink}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Header de Autenticación */}
        {!authLoading && !hasSession && (
          <View style={styles.authHeader}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                if (hasSession) return;
                router.push('/login');
              }}
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => {
                if (hasSession) return;
                router.push('/register');
              }}
            >
              <Text style={styles.registerButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}
        {hasSession && (
          <View style={styles.userHeader}>
            <TouchableOpacity onPress={() => setInvitationsVisible(true)} style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="#10464d" />
            </TouchableOpacity>
          </View>
        )}

        <EventsSwitch />

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onOpen={handleOpenEvent}
              onLike={(id) => console.log("Like:", id)}
              onComment={(id) => {
              const found = events.find((e) => e.id === id);
              if (found) {
                setSelectedEvent(found);
                setCommentsModalVisible(true);
              }
            }}
              onSave={(id) => console.log("Save:", id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyStateWrap}>
              <Text style={styles.emptyText}>No recommended events right now.</Text>
              <Text style={styles.emptySubtext}>
                There are no events from calendars you do not own or follow that you can currently access.
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <EventFeedModal
          visible={modalVisible}
          onClose={handleCloseModal}
          event={selectedEvent as FeedEvent}
        />
        <CommentsModal
          visible={commentsModalVisible}
          onClose={() => setCommentsModalVisible(false)}
          event={selectedEvent}
        />
        <InvitationsModal
          visible={invitationsVisible}
          onClose={() => setInvitationsVisible(false)}
        />
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({

  container: {

    flex: 1,

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

  emptyStateWrap: {

    marginTop: 40,

    paddingHorizontal: 10,

  },

  emptySubtext: {

    marginTop: 6,

    textAlign: "center",

    color: "#4f6f74",

    opacity: 0.9,

    lineHeight: 20,

    fontSize: 13,

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

  loginButtonText: {

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

  registerButtonText: {

    color: '#FFFFFF',

    fontWeight: '600',

    fontSize: 16,

  },

  userHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  notificationBtn: {
    padding: 8,
    backgroundColor: "#EAF7F6",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#10464d",
  },

});
