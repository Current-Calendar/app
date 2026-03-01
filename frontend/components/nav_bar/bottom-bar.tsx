import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

interface Props {
  NavButton: any;
}

export default function BottomBar({ NavButton }: Props) {
  return (
    <View style={styles.bottomBar}>
      <NavButton icon="home" href="/calendars" />
      <NavButton icon="search" href="/search" />
      <NavButton icon="add-circle" />
      <NavButton icon="calendar" href="/switch-calendar" />
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