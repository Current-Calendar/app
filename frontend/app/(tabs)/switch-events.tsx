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
import apiClient from "@/services/api-client";
import { Platform } from "react-native";

const COOKIE_PREFERENCE_KEY = 'current_cookie_preference';
const COOKIE_PREFERENCE_COOKIE = 'current_cookie_preference';
type CookiePreference = 'accepted' | 'rejected';

function readCookiePreferenceFromCookie(): CookiePreference | null {
  if (Platform.OS !== 'web') return null;

  try {
    const pair = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${COOKIE_PREFERENCE_COOKIE}=`));
    if (!pair) return null;
    const rawValue = decodeURIComponent(pair.split('=').slice(1).join('='));
    return rawValue === 'accepted' || rawValue === 'rejected' ? rawValue : null;
  } catch {
    return null;
  }
}

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
  likes_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
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
  const [cookiePreference, setCookiePreference] = useState<CookiePreference | null>(null);

  

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

  const isLimitedMode = Platform.OS === 'web' && cookiePreference === 'rejected';

  // Helper para resolver URLs de imágenes (Lógica de main)
  const resolveImageUrl = (rawUrl?: string) => {
    if (!rawUrl) return "https://picsum.photos/seed/event/640/360";
    if (/^https?:\/\//.test(rawUrl)) return rawUrl;
    const base = API_CONFIG.rootBaseURL || API_CONFIG.BaseURL;
    return `${(base || "").replace(/\/+$/, "")}/${String(rawUrl).replace(/^\/+/, "")}`;
  };

  const readCookiePreference = () => {
    if (Platform.OS !== 'web') return;

    try {
      const saved = window.localStorage.getItem(COOKIE_PREFERENCE_KEY);
      if (!saved) {
        setCookiePreference(readCookiePreferenceFromCookie());
        return;
      }

      if (saved === 'accepted' || saved === 'rejected') {
        setCookiePreference(saved);
        return;
      }

      const parsed = JSON.parse(saved) as { value?: CookiePreference; expiresAt?: string };
      const isValidValue = parsed?.value === 'accepted' || parsed?.value === 'rejected';
      const expiryMs = parsed?.expiresAt ? new Date(parsed.expiresAt).getTime() : NaN;
      const isExpired = Number.isNaN(expiryMs) || expiryMs <= Date.now();

      if (!isValidValue || isExpired) {
        setCookiePreference(readCookiePreferenceFromCookie());
        return;
      }

      setCookiePreference(parsed.value);
    } catch {
      setCookiePreference(readCookiePreferenceFromCookie());
    }
  };

  useEffect(() => {
    readCookiePreference();
    if (Platform.OS !== 'web') return;

    const onCookiePreferenceChanged = () => {
      readCookiePreference();
    };
    window.addEventListener('current:cookiePreferenceChanged', onCookiePreferenceChanged);

    return () => {
      window.removeEventListener('current:cookiePreferenceChanged', onCookiePreferenceChanged);
    };
  }, []);

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
      if (isLimitedMode) {
        setEvents([]);
        setLoading(false);
        return;
      }

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
            username: e.creator_username || cal?.creator || "unknown",
            userAvatar: e.creator_photo || null,
            calendarId: String(e.calendars[0] || ""),
            calendarName: cal?.name || "General",
            likes_count: e.likes_count ?? 0,
            liked_by_me: e.liked_by_me ?? false,
            saved_by_me: e.saved_by_me ?? false,
            attendees: Array.isArray(e.attendees)
              ? e.attendees.map((a: any) => ({
                  name: a.username || a.name || "",
                  respondedAt: a.responded_at || a.respondedAt || "",
                  avatar: a.photo || a.avatar || undefined,
                }))
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
  }, [authLoading, isLimitedMode]);
  // Manejo de errores
  const errorMessage = calendarsError || eventsError;

  // Handlers de UI
  const handleSave = async (id: string) => {
    try {
      const res = await apiClient.post<{ saved: boolean }>(`/events/${id}/save/`);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, saved_by_me: res.saved } : e
        )
      );
    } catch (error) {
      Alert.alert("Error", "Could not save this event.");
      console.error("Save error:", error);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await apiClient.post<{ liked: boolean; likes_count: number }>(`/events/${id}/like/`);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, liked_by_me: res.liked, likes_count: res.likes_count }
            : e
        )
      );
    } catch (error) {
      Alert.alert("Error", "Could not like this event.");
      console.error("Like error:", error);
    }
  };

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

        <EventsSwitch />

        {isLimitedMode ? (
          <View style={styles.emptyStateWrap}>
            <View style={styles.limitedBanner}>
              <Text style={styles.limitedBannerTitle}>Limited recommendation mode</Text>
              <Text style={styles.limitedBannerBody}>
                Recommended events are hidden while optional cookies are rejected.
              </Text>
            </View>
            <Text style={styles.emptyText}>No recommended events right now.</Text>
            <Text style={styles.emptySubtext}>
              Accept optional cookies in Privacy settings to see event suggestions again.
            </Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                onOpen={handleOpenEvent}
                onLike={handleLike}
                onSave={handleSave}
                onComment={(id) => {
                  const found = events.find((e) => e.id === id);
                  if (found) {
                    setSelectedEvent(found);
                    setCommentsModalVisible(true);
                  }
                }}
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
        )}

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

  limitedBanner: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0c88b',
    backgroundColor: '#fff2dd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  limitedBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7a4d00',
    marginBottom: 2,
  },

  limitedBannerBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6a4706',
  },

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


});
