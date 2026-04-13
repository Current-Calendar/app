import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform,
  Modal,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import CommentsModalC from "@/components/comments-modal-c";
import { Calendar } from "@/types/calendar";
import apiClient from "@/services/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useRecommendedCalendars } from "@/hooks/use-recommended-calendars";
import { AdCard } from "@/components/ads/ad-card";
import { injectAds, isAdItem } from "@/components/ads/inject-ads";
import { useAdsConfig } from "@/hooks/use-ads-config";

type CalendarCategory = {
  id: number | string;
  name: string;
};

export default function CalendarsScreen() {
  const router = useRouter();

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const hasSession = isAuthenticated || Boolean(user);

  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [subscribedCalendarIds, setSubscribedCalendarIds] = useState<string[]>(
    []
  );
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(
    null
  );
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [errorSubscribeModal, setErrorSubscibeModal] = useState(false);
  const [subscribeErrorMessage, setSubscribeErrorMessage] = useState("");

  const {
    calendars: backendCalendars,
    loading: loadingCalendars,
    error: calendarsError,
  } = useRecommendedCalendars({ enabled: isAuthenticated });

  const { data: adsConfig } = useAdsConfig();

  if (calendarsError) {
    Alert.alert("Error", calendarsError);
  }

  useEffect(() => {
    if (calendarsError) {
      console.error("Error fetching data:", calendarsError);
      Alert.alert("Error", "Could not load calendars.");
    }
  }, [calendarsError]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchSubscribedCalendars = async () => {
      try {
        const subscribedData = await apiClient.get<any[]>(
          "/calendars/subscribed/"
        );
        const dataArray = Array.isArray(subscribedData)
          ? subscribedData
          : (subscribedData as any)?.data || [];

        setSubscribedCalendarIds(dataArray.map((c: any) => String(c.id)));
      } catch (error) {
        console.error("Error fetching subscribed data:", error);
      }
    };

    void fetchSubscribedCalendars();
  }, [isAuthenticated]);

  useEffect(() => {
    const buildCalendars = async () => {
      const COLORS = [
        "#6C63FF",
        "#FF6584",
        "#43D9AD",
        "#FFB84C",
        "#FF9F43",
        "#00CFE8",
      ];

      const filteredCalendars = backendCalendars.filter((c: any) => {
        const calendarId = String(c.id);
        const creatorId = String(c.creator_id ?? c.creator?.id ?? "");
        const isNotMine = !user?.id || creatorId !== String(user.id);
        const isNotSubscribed = !subscribedCalendarIds.includes(calendarId);
        const isVisibleByPrivacy = c.privacy === "PUBLIC";

        return isVisibleByPrivacy && isNotMine && isNotSubscribed;
      });

      const baseCalendars: Calendar[] = filteredCalendars.map(
        (c: any, index: number) => ({
          id: String(c.id),
          name: c.name,
          description: c.description || "",
          privacy: c.privacy,
          origin: c.origin,
          creator: c.creator || c.creator_username || "unknown",
          color: COLORS[index % COLORS.length],
          cover: c.cover || null,
          likes_count: c.likes_count,
          liked_by_me: c.liked_by_me || false,
          categories: [],
        })
      );

      const mappedCalendars: Calendar[] = await Promise.all(
        baseCalendars.map(async (calendar) => {
          try {
            const categoriesResponse: any = await apiClient.get(
              `/categories/for-calendar/${calendar.id}/`
            );

            const categories: CalendarCategory[] =
              (Array.isArray(categoriesResponse) && categoriesResponse) ||
              (Array.isArray(categoriesResponse?.results) &&
                categoriesResponse.results) ||
              (Array.isArray(categoriesResponse?.data) &&
                categoriesResponse.data) ||
              [];

            return {
              ...calendar,
              categories: categories.map((category: any) => ({
                id: category.id,
                name: category.name,
              })),
            };
          } catch (error) {
            console.log(
              "Error loading calendar categories:",
              calendar.id,
              error
            );
            return {
              ...calendar,
              categories: [],
            };
          }
        })
      );

      setCalendars(mappedCalendars);
    };

    void buildCalendars();
  }, [backendCalendars, user, hasSession, subscribedCalendarIds]);

  const handleOpenCalendar = (id: string) => {
    router.push(`/calendar-view?calendarId=${id}`);
  };

  const handleLike = async (id: string) => {
    try {
      const res = await apiClient.post<{ liked: boolean }>(
        `/calendars/${id}/like/`
      );
      setCalendars((prev) =>
        prev.map((calendar) => {
          if (calendar.id === id) {
            const currentLikes = calendar.likes_count ?? 0;
            return {
              ...calendar,
              liked_by_me: res.liked,
              likes_count: res.liked
                ? currentLikes + 1
                : Math.max(0, currentLikes - 1),
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
      const res = await apiClient.post<{ subscribed: boolean }>(
        `/calendars/${id}/subscribe/`
      );

      if (res.subscribed) {
        setSubscribedCalendarIds((prev) => [...prev, id]);
        setCalendars((prev) => prev.filter((calendar) => calendar.id !== id));
        Alert.alert("¡Listo!", "Te has suscrito correctamente.");
      } else {
        setSubscribedCalendarIds((prev) =>
          prev.filter((favId) => favId !== id)
        );
      }
    } catch (error: any) {
      const apiError =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        String(error);

      if (Platform.OS !== "web") {
        Alert.alert("Error", apiError);
      } else {
        setSubscribeErrorMessage(apiError);
        setErrorSubscibeModal(true);
      }
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

  const listData = adsConfig?.show_ads
    ? injectAds(calendars, adsConfig.frequency)
    : calendars;

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {!authLoading && !hasSession ? (
          <View style={styles.authHeader}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                if (hasSession) return;
                router.push("/login");
              }}
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => {
                if (hasSession) return;
                router.push("/register");
              }}
            >
              <Text style={styles.registerButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <EventsSwitch />

        <FlatList
          data={listData}
          keyExtractor={(item) =>
            isAdItem(item) ? item.id : (item as Calendar).id
          }
          renderItem={({ item }) => {
            if (isAdItem(item)) return <AdCard placement="feed" />;
            const calendar = item as Calendar;
            return (
              <CalendarCard
                calendar={calendar}
                onPress={handleOpenCalendar}
                onLike={handleLike}
                onSubscribe={handleSubscribe}
                onComment={handleOpenCalendarComments}
                isSubscribed={subscribedCalendarIds.includes(calendar.id)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyStateWrap}>
              <Text style={styles.emptyText}>
                No recommended calendars right now.
              </Text>
              <Text style={styles.emptySubtext}>
                You may already follow all available calendars, or none match
                your privacy access.
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

        <Modal
          visible={errorSubscribeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setErrorSubscibeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Free Plan Limit</Text>
              <Text style={styles.modalMessage}>{subscribeErrorMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setErrorSubscibeModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E53935",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: "#E53935",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});