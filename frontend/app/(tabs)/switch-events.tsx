import { View, FlatList, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";
import { API_CONFIG } from "@/constants/api";

/**
 * 🔹 Tipo compartido con backend
 * Cuando backend conecte, este type debe alinearse con el DTO real
 */
export interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  date: string;
  image: string;
  username: string;
  userAvatar: string;
  calendarId: string;
  calendarName: string;
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [calRes, evRes] = await Promise.all([
          fetch(API_CONFIG.endpoints.getCalendars),
          fetch(API_CONFIG.endpoints.getEvents),
        ]);

        if (!calRes.ok || !evRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const calData = await calRes.json();
        const evData = await evRes.json();

        // Map calendars for easy lookup
        const calendarMap: Record<number, any> = {};
        calData.forEach((c: any) => {
          calendarMap[Number(c.id)] = c;
        });

        const mappedEvents: any[] = evData.map((e: any) => {
          const cal = calendarMap[e.calendars[0]];
          return {
            id: String(e.id),
            title: e.title,
            description: e.description || "",
            location: e.place_name || "",
            date: e.date,
            image: e.photo, // Placeholder for now
            username: cal?.creator_username || "unknown",
            userAvatar: "https://i.pravatar.cc/100?u=" + (cal?.creator_username || "unknown"),
            calendarId: String(e.calendars[0] || ""),
            calendarName: cal?.name || "General",
          };
        });

        setEvents(mappedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
        Alert.alert("Error", "Could not load events.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const handleOpenEvent = (id: string) => {
    // Conectar con show de events
    //router.push(`/events/${id}`);
  };

  const handleLike = (id: string) => {
    console.log("Like:", id);
  };

  const handleComment = (id: string) => {
    console.log("Comment:", id);
  };

  const handleSave = (id: string) => {
    console.log("Save:", id);
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
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onOpen={handleOpenEvent}
              onLike={handleLike}
              onComment={handleComment}
              onSave={handleSave}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
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