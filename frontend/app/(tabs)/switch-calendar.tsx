import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import { Calendar } from "@/types/calendar";
import { API_CONFIG } from '@/constants/api';

export default function CalendarsScreen() {
  const router = useRouter();

  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [calRes] = await Promise.all([
          fetch(API_CONFIG.endpoints.getCalendars),
        ]);

        if (!calRes.ok) {
          throw new Error('Failed to fetch calendars data');
        }

        const calData = await calRes.json();

        const COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB84C', '#FF9F43', '#00CFE8'];

        const mappedCalendars: Calendar[] = calData.map((c: any, index: number) => ({
          id: String(c.id),
          name: c.name,
          description: c.description || '',
          privacy: c.privacy,
          origen: c.origen,
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
  }, []);

  const handleOpenCalendar = (id: string) => {
    router.push(`/calendar-view?calendarId=${id}`);
  };

  const handleSubscribe = (id: string) => {
    console.log("Subscribe to calendar:", id);
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