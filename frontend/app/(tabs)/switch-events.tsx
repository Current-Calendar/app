import { View, FlatList, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import EventsSwitch from "@/components/event-calendar/switch-event-calendar";
import EventCard from "@/components/event-calendar/event-card";

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
}

//Borrar cuando se conecte con backend
const mockEvents: Event[] = [
  {
    id: "1",
    title: "COAC 2026 Quarter Finals",
    description:
      "Join us for an unforgettable evening of gourmet cuisine and fine wines.",
    location: "Cádiz",
    date: "February 2nd 2026",
    image: "https://picsum.photos/600/400?random=1",
    username: "LaCabra123",
    userAvatar: "https://i.pravatar.cc/100?img=3",
  },
  {
    id: "2",
    title: "Techno Night Festival",
    description:
      "Electronic music all night long with international DJs.",
    location: "Berlin",
    date: "March 14th 2026",
    image: "https://picsum.photos/600/400?random=2",
    username: "ElectroMax",
    userAvatar: "https://i.pravatar.cc/100?img=5",
  },
  {
    id: "3",
    title: "Startup Networking Meetup",
    description:
      "Connect with founders, developers and investors.",
    location: "Madrid",
    date: "April 5th 2026",
    image: "https://picsum.photos/600/400?random=3",
    username: "FounderLife",
    userAvatar: "https://i.pravatar.cc/100?img=8",
  },
  {
    id: "4",
    title: "Indie Rock Live Concert",
    description:
      "An amazing live concert experience you can't miss.",
    location: "London",
    date: "May 20th 2026",
    image: "https://picsum.photos/600/400?random=4",
    username: "RockSoul",
    userAvatar: "https://i.pravatar.cc/100?img=12",
  },
];

export default function EventsScreen() {
  const router = useRouter();

  /**
   * 🔹 Luego se sustituirá por useQuery / fetch
   */
  const [events] = useState<Event[]>(mockEvents);
  
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

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
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