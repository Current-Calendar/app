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
import InvitationsModal from "@/components/InvitationsModal";
import { Ionicons } from "@expo/vector-icons";
import { useRecommendedCalendars } from '@/hooks/use-recommended-calendars';


export default function CalendarsScreen() {
  const router = useRouter();

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const hasSession = isAuthenticated || Boolean(user);

  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [subscribedCalendarIds, setSubscribedCalendarIds] = useState<string[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [invitationsVisible, setInvitationsVisible] = useState(false);
  const {
    calendars: backendCalendars,
    loading: loadingCalendars,
    error: calendarsError,
  } = useRecommendedCalendars();

  if (calendarsError) {
    Alert.alert('Error', calendarsError);
  }
  
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

  useEffect(() => {
    const COLORS = ["#6C63FF", "#FF6584", "#43D9AD", "#FFB84C", "#FF9F43", "#00CFE8"];

    const filteredCalendars = backendCalendars.filter((c: any) => {
      const calendarId = String(c.id);
      const creatorId = String(c.creator_id ?? c.creator?.id ?? "");
      const isNotMine = !user?.id || creatorId !== String(user.id);
      const isNotSubscribed = !subscribedCalendarIds.includes(calendarId);
      const isVisibleByPrivacy =
        c.privacy === "PUBLIC" || (c.privacy === "FRIENDS" && hasSession);

      return isVisibleByPrivacy && isNotMine && isNotSubscribed;
    });

    const mappedCalendars: Calendar[] = filteredCalendars.map((c: any, index: number) => ({
      id: String(c.id),
      name: c.name,
      description: c.description || "",
      privacy: c.privacy,
      origin: c.origin,
      creator: c.creator || "unknown",
      color: COLORS[index % COLORS.length],
      cover: c.cover || null,
      likes_count: c.likes_count,
      liked_by_me : c.liked_by_me || false
    }));

    setCalendars(mappedCalendars);
  }, [backendCalendars, user, hasSession, subscribedCalendarIds]);

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
      Alert.alert(
        res.subscribed ? 'Subscribed' : 'Unsubscribed',
        res.subscribed ? 'You are now subscribed to this calendar.' : 'You have unsubscribed from this calendar.'
      );
    } catch (error) {
      Alert.alert('Error', 'Could not subscribe to this calendar.');
      console.error('Subscribe error:', error);
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
        {!authLoading && !hasSession ? (
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
        ) : (
          <View style={styles.userHeader}>
            <TouchableOpacity onPress={() => setInvitationsVisible(true)} style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="#10464d" />
            </TouchableOpacity>
          </View>
        )}


        <EventsSwitch />

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
            <View style={styles.emptyStateWrap}>
              <Text style={styles.emptyText}>No recommended calendars right now.</Text>
              <Text style={styles.emptySubtext}>
                You may already follow all available calendars, or none match your privacy access.
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <CommentsModalC
          visible={commentsModalVisible}
          onClose={handleCloseCommentsModal}
          calendar={selectedCalendar}
        />

        <InvitationsModal
          visible={invitationsVisible}
          onClose={() => setInvitationsVisible(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },

  centered: {
    justifyContent: "center",
  },

  inner: {
    width: '100%',
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
  userHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  notificationBtn: {
    padding: 8,
    backgroundColor: "#EAF7F6",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#10464d",
  },
});
