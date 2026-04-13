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
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
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
  const [cookiePreference, setCookiePreference] = useState<CookiePreference | null>(null);

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

  const isLimitedMode = Platform.OS === 'web' && cookiePreference === 'rejected';
  const {
    calendars: backendCalendars,
    loading: loadingCalendars,
    error: calendarsError,
    refetch: refetchCalendars,
  } = useRecommendedCalendars({ enabled: isAuthenticated && !isLimitedMode });

  const { data: adsConfig } = useAdsConfig();

  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && !isLimitedMode) {
        refetchCalendars();
      }
    }, [isAuthenticated, isLimitedMode, refetchCalendars])
  );

  useEffect(() => {
    if (isLimitedMode) {
      setCalendars([]);
    }
  }, [isLimitedMode]);
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


        <FlatList
          data={listData}
          keyExtractor={(item) => (isAdItem(item) ? item.id : (item as Calendar).id)}
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
              <Text style={styles.emptyText}>No recommended calendars right now.</Text>
              <Text style={styles.emptySubtext}>
                You may already follow all available calendars, or none match your privacy access.
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
      const res = await apiClient.post<{ liked: boolean; likes_count: number }>(
        `/calendars/${id}/like/`
      );
      setCalendars((prev) =>
        prev.map((calendar) =>
          calendar.id === id
            ? {
                ...calendar,
                liked_by_me: res.liked,
                likes_count: res.likes_count,
              }
            : calendar
        )
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

  if (isLimitedMode) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          {isLimitedMode ? (
            <View style={styles.limitedBanner}>
              <Text style={styles.limitedBannerTitle}>Limited recommendation mode</Text>
              <Text style={styles.limitedBannerBody}>
                Recommended calendars are disabled while optional cookies are rejected.
              </Text>
            </View>
          ) : null}

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
          ) : null}

          <EventsSwitch />

          <View style={styles.emptyStateWrap}>
            <Text style={styles.emptyText}>No recommended calendars right now.</Text>
            <Text style={styles.emptySubtext}>
              Recommended calendars are hidden while optional cookies are rejected.
            </Text>
            <Text style={styles.emptySubtext}>
              Accept optional cookies in Privacy settings to see calendar suggestions again.
            </Text>
          </View>
        </View>
      </View>
    );
  }

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
        {isLimitedMode ? (
          <View style={styles.limitedBanner}>
            <Text style={styles.limitedBannerTitle}>Limited recommendation mode</Text>
            <Text style={styles.limitedBannerBody}>
              Recommended calendars are disabled while optional cookies are rejected.
            </Text>
          </View>
        ) : null}

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
          keyExtractor={(item) => (isAdItem(item) ? item.id : (item as Calendar).id)}
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

  limitedBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
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