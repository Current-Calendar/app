import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import { Calendar } from "@/types/calendar";
import apiClient from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';

export default function CalendarsScreen() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const calData = await apiClient.get<any[]>("/recommendations/calendars/");

        const COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB84C', '#FF9F43', '#00CFE8'];

        const mappedCalendars: Calendar[] = calData.map((c: any, index: number) => ({
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
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Could not load calendars or events.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [authLoading]);

  const handleOpenCalendar = (id: string) => {
    router.push(`/calendar-view?calendarId=${id}`);
  };

  const handleSubscribe = async (id: string) => {
    try {
      const res = await apiClient.post<{ subscribed: boolean }>(`/calendars/${id}/subscribe/`);
      Alert.alert(
        res.subscribed ? "Subscribed" : "Unsubscribed",
        res.subscribed ? "You are now subscribed to this calendar." : "You have unsubscribed from this calendar."
      );
    } catch (error) {
      Alert.alert("Error", "Could not subscribe to this calendar.");
      console.error("Subscribe error:", error);
    }
  };

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
        <EventsSwitch />

        <FlatList
          data={calendars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CalendarCard
              calendar={item}
              onPress={handleOpenCalendar}
              onSubscribe={handleSubscribe}
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
    backgroundColor: "#E8E5D8",
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
});