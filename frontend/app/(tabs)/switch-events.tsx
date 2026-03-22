import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Text, ImageSourcePropType } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";
import EventFeedModal from "@/components/event-feed-modal";
import { useCalendars } from "@/hooks/use-calendars";
import { useEventsList } from "@/hooks/use-events";
import CommentsModal from "@/components/comments-modal";
import { useAuth } from "@/hooks/use-auth";
import { API_CONFIG } from "@/constants/api";
import { LabelFilterBar } from "@/components/label-filter-bar";
import { useEventLabels } from "@/hooks/use-event-labels";
import { EventLabel, EventType } from "@/types/calendar";

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
  type?: EventType;
  labels?: string[];
  labelObjects?: EventLabel[];
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
  const {
    labels: labelCatalog,
    customLabels,
    assignments: labelAssignments,
    getLabelsForEvent,
    getLabelObjects,
    labelIdFromType,
  } = useEventLabels();

  // Hooks de datos (HEAD)
  const { calendars: backendCalendars, error: calendarsError } = useCalendars();
  const { events: backendEvents, loading: loadingEvents, error: eventsError, refetch } = useEventsList();

  // Estados de UI (main)
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedLabelId && !labelCatalog.find((l) => l.id === selectedLabelId)) {
      setSelectedLabelId(null);
    }
  }, [labelCatalog, selectedLabelId]);

  // Helper para resolver URLs de imágenes (Lógica de main)
  const resolveImageUrl = (rawUrl?: string) => {
    if (!rawUrl) return "https://picsum.photos/seed/event/640/360";
    if (/^https?:\/\//.test(rawUrl)) return rawUrl;
    const base = API_CONFIG.rootBaseURL || API_CONFIG.BaseURL;
    return `${(base || "").replace(/\/+$/, "")}/${String(rawUrl).replace(/^\/+/, "")}`;
  };

  // Mapeo y transformación de datos
  useEffect(() => {
    if (backendCalendars.length > 0 || backendEvents.length > 0) {
      const calendarMap: Record<number, any> = {};
      backendCalendars.forEach((c: any) => {
        calendarMap[Number(c.id)] = c;
      });

      const mappedEvents: Event[] = backendEvents.map((e: any, index: number) => {
        const calId = Array.isArray(e.calendars) ? e.calendars[0] : e.calendars;
        const cal = calendarMap[Number(calId)];
        const type = (e.type || e.tipo || 'other') as EventType;
        const typeLabelId = labelIdFromType(type);
        const manualLabels = getLabelsForEvent(String(e.id));
        const labelIds = Array.from(new Set([
          ...(typeLabelId ? [typeLabelId] : []),
          ...(manualLabels ?? []),
        ]));
        const labelObjects = getLabelObjects(labelIds);

        return {
          id: String(e.id),
          title: e.title || e.titulo || "",
          description: e.description || e.descripcion || "",
          location: e.place_name || e.nombre_lugar || "",
          date: e.date || e.fecha || "",
          time: typeof (e.time || e.hora) === "string" ? String(e.time || e.hora).slice(0, 5) : "",
          image: resolveImageUrl(e.photo || e.foto),
          username: e.creator_username || cal?.creator_username || "unknown",
          userAvatar: (e.creator_photo && e.creator_photo.trim() !== "")
            ? e.creator_photo
            : (cal?.creator_photo && cal.creator_photo.trim() !== ""
              ? cal.creator_photo
              : require("../../assets/images/default-user.jpg")),
          calendarId: String(calId || ""),
          calendarName: cal?.name || "General",
          type,
          labels: labelIds,
          labelObjects,
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
    }
  }, [backendCalendars, backendEvents, labelAssignments, getLabelsForEvent, getLabelObjects, labelIdFromType]);

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

  const visibleEvents = selectedLabelId
    ? events.filter((evt) => evt.labels?.includes(selectedLabelId))
    : events;

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

        <EventsSwitch />

        <View style={styles.filtersRow}>
          <LabelFilterBar
            labels={labelCatalog}
            selected={selectedLabelId}
            onChange={setSelectedLabelId}
          />
        </View>

        <FlatList
          data={visibleEvents}
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
          ListEmptyComponent={<Text style={styles.emptyText}>No events to display.</Text>}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <EventFeedModal
          visible={modalVisible}
          onClose={handleCloseModal}
          event={selectedEvent}
        />
        <CommentsModal
        visible={commentsModalVisible}
        onClose={() => setCommentsModalVisible(false)}
        event={selectedEvent}
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
  filtersRow: {
    marginHorizontal: 16,
    marginBottom: 10,
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

});
