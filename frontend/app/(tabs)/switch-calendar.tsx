import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import { Calendar } from "@/types/calendar";
import { useCalendars } from '@/hooks/use-calendars';

export default function CalendarsScreen() {
  const router = useRouter();

  const [calendars, setCalendars] = useState<Calendar[]>([]);
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
    const COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB84C', '#FF9F43', '#00CFE8'];

    const mappedCalendars: Calendar[] = backendCalendars.map((c: any, index: number) => ({
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
  }, [backendCalendars]);

  const handleOpenCalendar = (id: string) => {
    router.push(`/calendar-view?calendarId=${id}`);
  };

  const handleSubscribe = (id: string) => {
    console.log("Subscribe to calendar:", id);
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