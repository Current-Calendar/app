import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import apiClient from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useRecommendedCalendars } from '@/hooks/use-recommended-calendars';

export default function CalendarsScreen() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();
  const { calendars, loading, error } = useRecommendedCalendars();

  if (error) {
    Alert.alert('Error', error);
  }

  const handleOpenCalendar = (id: string) => {
    router.push(`/calendar-view?calendarId=${id}`);
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
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
    alignItems: 'center',
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
});
