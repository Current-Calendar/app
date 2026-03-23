import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import CommentsModalC from "@/components/comments-modal-c";
import { Calendar } from "@/types/calendar";
import apiClient from "@/services/api-client";
import { useCalendars } from "@/hooks/use-calendars";
import { useAuth } from "@/hooks/use-auth";
import { LabelFilterBar } from "@/components/label-filter-bar";
import { useEventLabels } from "@/hooks/use-event-labels";

export default function CalendarsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const hasSession = isAuthenticated || Boolean(user);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [subscribedCalendarIds, setSubscribedCalendarIds] = useState<string[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  const {
    calendars: backendCalendars,
    loading: loadingCalendars,
    error: calendarsError,
  } = useCalendars();
  const { labels: labelCatalog } = useEventLabels();

  useEffect(() => {
    if (calendarsError) {
      console.error("Error fetching data:", calendarsError);
      Alert.alert("Error", "Could not load calendars.");
    }
  }, [calendarsError]);

  useEffect(() => {
    const fetchSubscribedCalendars = async () => {
      try {
        const subscribedData = await apiClient.get<any[]>("/calendars/subscribed/");
        const dataArray = Array.isArray(subscribedData)
          ? subscribedData
          : (subscribedData as any)?.data || [];

        setSubscribedCalendarIds(dataArray.map((c: any) => String(c.id)));
      } catch (error) {
        console.error("Error fetching subscribed data:", error);
      }
    };

    void fetchSubscribedCalendars();
  }, []);

  const normalizeLabel = (name: string) => {
    const t = name?.trim() || '';
    if (!t) return '';
    return t.slice(0,1).toUpperCase() + t.slice(1).toLowerCase();
  };

  useEffect(() => {
    const COLORS = ["#6C63FF", "#FF6584", "#43D9AD", "#FFB84C", "#FF9F43", "#00CFE8"];

    const mapCalendars = (list: any[], allowAll = false) =>
      (allowAll ? list : list.filter((c: any) => c.privacy === "PUBLIC"))
        .filter((c: any) => String(c.creator_id) !== String(user?.id)) // never show my own
        .map((c: any, index: number) => ({
          id: String(c.id),
          name: c.name,
          description: c.description || "",
          privacy: c.privacy,
          origin: c.origin,
          creator: c.creator_username || c.creator || "unknown",
          color: COLORS[index % COLORS.length],
          cover: c.cover || null,
          likes_count: c.likes_count,
          liked_by_me: c.liked_by_me || false,
          labels: c.labels || [],
        }));

    const fetchFiltered = async () => {
      if (!selectedLabelId) {
        setCalendars(mapCalendars(backendCalendars));
        return;
      }
      const label = labelCatalog.find((l) => String(l.id) === String(selectedLabelId));
      if (!label?.name) {
        setCalendars(mapCalendars(backendCalendars));
        return;
      }
      try {
        const resp = await apiClient.get<any>(`/calendars/filter-by-label/?label=${encodeURIComponent(normalizeLabel(label.name))}`);
        const list = Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.results)
            ? resp.results
            : Array.isArray(resp?.calendars)
              ? resp.calendars
              : [];
        // When filtering by label, show every calendar returned by backend (do not hide by privacy/owner)
        setCalendars(mapCalendars(list, true));
      } catch (err) {
        console.error('Error filtering calendars by label', err);
        setCalendars(mapCalendars(backendCalendars));
      }
    };

    void fetchFiltered();
  }, [backendCalendars, user, selectedLabelId, labelCatalog]);

  const handleOpenCalendar = (id: string) => {
    router.push(`/calendar-view?calendarId=${id}`);
  };
  
  const handleLike = async (id: string) => {
    try {
    const res = await apiClient.post<{ liked: boolean }>(`/calendars/${id}/like/`);
    setCalendars((prev) =>
      prev.map((calendar) => {
        if (calendar.id === id) {
          return {
            ...calendar,
            liked_by_me: res.liked,
            likes_count: res.liked 
              ? calendar.likes_count + 1 
              : calendar.likes_count - 1,
          };
        }
        return calendar;
      })
    );
  } catch (error) {
    Alert.alert("Error", "Could not like this calendar.");
    console.error("Like error:", error);
  }
};

  const handleOpenCalendarComments = (id: string) => {
    const found = calendars.find((c) => c.id === id);
    if (found) {
      setSelectedCalendar(found);
      setCommentsModalVisible(true);
    }
  };

  const handleCloseCommentsModal = () => {
    setCommentsModalVisible(false);
    setSelectedCalendar(null);
  };

  const handleSubscribe = async (id: string) => {
    try {
      const res = await apiClient.post<{ subscribed: boolean }>(`/calendars/${id}/subscribe/`);

      setSubscribedCalendarIds((prev) => {
        if (res.subscribed) {
          return prev.includes(id) ? prev : [...prev, id];
        }
        return prev.filter((calendarId) => calendarId !== id);
      });

      Alert.alert(
        res.subscribed ? "Subscribed" : "Unsubscribed",
        res.subscribed
          ? "You are now subscribed to this calendar."
          : "You have unsubscribed from this calendar."
      );
    } catch (error) {
      Alert.alert("Error", "Could not subscribe to this calendar.");
      console.error("Subscribe error:", error);
    }
  };

  if (loadingCalendars) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10464d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
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
          data={calendars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CalendarCard
              calendar={item}
              onPress={handleOpenCalendar}
              onLike={handleLike}
              onSubscribe={handleSubscribe}
              onComment={handleOpenCalendarComments}
              isSubscribed={subscribedCalendarIds.includes(item.id)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No calendars to display.</Text>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <CommentsModalC
          visible={commentsModalVisible}
          onClose={handleCloseCommentsModal}
          calendar={selectedCalendar}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },

  centered: {
    justifyContent: "center",
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
  filtersRow: {
    marginHorizontal: 16,
    marginBottom: 10,
  },

  emptyText: {
    marginTop: 40,
    textAlign: "center",
    color: "#10464d",
    opacity: 0.8,
    fontWeight: "600",
  },

  authHeader: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },

  loginButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#10464d",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  loginButtonText: {
    color: "#10464d",
    fontWeight: "600",
    fontSize: 16,
  },

  registerButton: {
    flex: 1,
    backgroundColor: "#10464d",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  registerButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
