import { View, FlatList, StyleSheet, ActivityIndicator, Text } from "react-native";
import { useState, useEffect } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";
import { API_CONFIG } from "@/constants/api";
import { PublicEventDetailModal } from "@/components/public-event-detail-modal";
import type { CalendarEvent } from "@/types/calendar";

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
  time: string;
  image: string;
  username: string;
  userAvatar: string;
  calendarId: string;
  calendarName: string;
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

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
          (Array.isArray(calData?.calendarios) && calData.calendarios) ||
          (Array.isArray(calData?.results) && calData.results) ||
          [];

        const eventsList =
          (Array.isArray(evData) && evData) ||
          (Array.isArray(evData?.eventos) && evData.eventos) ||
          (Array.isArray(evData?.results) && evData.results) ||
          [];

        // Map calendars for easy lookup
        const calendarMap: Record<number, any> = {};
        calendars.forEach((c: any) => {
          calendarMap[c.id] = c;
        });

        const resolveImageUrl = (rawUrl?: string) => {
          if (!rawUrl) return "https://picsum.photos/seed/event/640/360";
          if (/^https?:\/\//.test(rawUrl)) return rawUrl;
          const base = API_CONFIG.rootBaseURL || API_CONFIG.BaseURL;
          return `${(base || "").replace(/\/+$/, "")}/${String(rawUrl).replace(/^\/+/, "")}`;
        };

        const mappedEvents: Event[] = eventsList.map((e: any) => {
          const firstCalendarId = Array.isArray(e.calendarios) ? e.calendarios[0] : undefined;
          const cal = firstCalendarId ? calendarMap[firstCalendarId] : undefined;
          return {
            id: String(e.id),
            title: e.titulo,
            description: e.descripcion || "",
            location: e.nombre_lugar || "",
            date: e.fecha,
            time: typeof e.hora === "string" ? e.hora.slice(0, 5) : "",
            image: resolveImageUrl(e.foto),
            username: cal?.creador_username || "unknown",
            userAvatar: "https://i.pravatar.cc/100?u=" + (cal?.creador_username || "unknown"),
            calendarId: String(firstCalendarId || ""),
            calendarName: cal?.nombre || "General",
          };
        }).filter((evt) => evt.id && evt.title);

        if (!cancelled) {
          setEvents(mappedEvents);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        if (!cancelled) {
          setEvents([]);
          setErrorMessage("No se pudieron cargar los eventos. Intentalo de nuevo.");
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
    const selected = events.find((event) => event.id === id);
    if (!selected) return;

    setActiveEvent({
      id: selected.id,
      calendarId: selected.calendarId,
      titulo: selected.title,
      descripcion: selected.description ?? "",
      nombre_lugar: selected.location,
      fecha: selected.date,
      hora: selected.time,
      foto: selected.image,
      color: "#10464d",
    });
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
        <Text style={styles.loadingText}>Cargando feed...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorTitle}>No se pudo cargar el feed</Text>
        <Text style={styles.loadingText}>{errorMessage}</Text>
        <Text style={styles.retryLink} onPress={() => setReloadKey((k) => k + 1)}>
          Reintentar
        </Text>
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
          ListEmptyComponent={<Text style={styles.emptyText}>No hay eventos para mostrar.</Text>}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <PublicEventDetailModal
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
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
});