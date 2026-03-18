import { View, FlatList, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import { Calendar } from "@/types/calendar";
import apiClient from '@/services/api-client';
import { useCalendars } from '@/hooks/use-calendars';
import { useAuth } from '@/hooks/use-auth';

export default function CalendarsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const hasSession = isAuthenticated || Boolean(user);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [subscribedCalendarIds, setSubscribedCalendarIds] = useState<string[]>([]);
  const {
    calendars: backendCalendars,
    loading: loadingCalendars,
    error: calendarsError,
  } = useCalendars();

  useEffect(() => {
    if (calendarsError) {
      console.error('Error fetching data:', calendarsError);
      Alert.alert('Error', 'Could not load calendars or events.');
    }
  }, [calendarsError]);

  useEffect(() => {
    const fetchSubscribedCalendars = async () => {
      try {
        const subscribedData = await apiClient.get<any[]>('/calendars/subscribed/');
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
    const COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB84C', '#FF9F43', '#00CFE8'];

    const filteredCalendars = backendCalendars.filter((c: any) => {
      const isPublic = c.privacy === 'PUBLIC';
      const isNotMine = String(c.creator_id) !== String(user?.id);
      return isPublic && isNotMine;
    });

    const mappedCalendars: Calendar[] = filteredCalendars.map((c: any, index: number) => ({
      id: String(c.id),
      name: c.name,
      description: c.description || '',
      privacy: c.privacy,
      origin: c.origin,
      creator: c.creator_username || 'unknown',
      color: COLORS[index % COLORS.length],
      cover: c.cover || null,
    }));

    setCalendars(mappedCalendars);
  }, [backendCalendars, user]);

  const handleOpenCalendar = (id: string) => {
    router.push(`/calendar-view?calendarId=${id}`);
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
  const loading = loadingCalendars;
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

        <FlatList
          data={calendars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CalendarCard
              calendar={item}
              onPress={handleOpenCalendar}
              onSubscribe={handleSubscribe}
              isSubscribed={subscribedCalendarIds.includes(item.id)}
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
