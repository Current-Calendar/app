import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

interface Props {
  NavButton: any;
}

export default function BottomBar({ NavButton }: Props) {
  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <View style={styles.bottomBar}>
      <NavButton icon="home" href="/calendars" />
      <NavButton icon="search" href="/search" />
      <NavButton icon="add-circle" href={`/create_events?date=${getTodayFormatted()}`} />
      <NavButton icon="calendar-clear" href="/calendar-view" />
      <NavButton icon="calendar" href="/switch-calendar" />
      <NavButton icon="chatbubble-ellipses" />
      <NavButton icon="compass" href="/radar" />
      {/*<NavButton icon="compass" />*/}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 60,
    backgroundColor: "#10464d",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 35,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },

    elevation: 8,
  },
});
