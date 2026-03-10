import { View, FlatList, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import CalendarCard from "@/components/event-calendar/calendar-card";
import { Calendar } from "@/types/calendar";
import { API_CONFIG } from '@/constants/api';
//import { styles } from "./switch-events";

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
         <View style={styles.authHeader}>
          <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/register')}
          >
            <Text style={styles.registerButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

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
  loginButtonText:{
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
  registerButtonText:{
    color:'#FFFFFF',
    fontWeight:'600',
    fontSize: 16,
  },
});