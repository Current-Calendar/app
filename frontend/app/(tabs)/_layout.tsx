import { Slot } from "expo-router";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWindowDimensions } from "react-native";

export default function CustomTabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; // puedes ajustar el breakpoint

  const NavButton = ({
    icon,
    isCenter = false,
  }: {
    icon: any;
    isCenter?: boolean;
  }) => {
    return (
      <Pressable
        style={[
          styles.navButton,
        ]}
      >
        <Ionicons
          name={icon}
          size={isCenter ? 32 : 24}
          color="#ffffff"
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* WEB SIDEBAR */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <NavButton icon="home" />
          <NavButton icon="search" />
          <NavButton icon="calendar" />
          <NavButton icon="people" />
          <NavButton icon="compass" />
          <NavButton icon="settings" />
          <NavButton icon="person" />
        </View>
      )}

      {/* CONTENIDO */}
      <View style={styles.content}>
        <Slot />
      </View>

      {/* MOBILE BOTTOM BAR */}
      {!isDesktop && (
        <View style={styles.bottomBar}>
          <NavButton icon="home" />
          <NavButton icon="search" />
          <NavButton icon="add-circle" />
          <NavButton icon="chatbubble-ellipses" />
          <NavButton icon="compass" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
    backgroundColor: "#E8E5D8",
  },

  // WEB SIDEBAR
  sidebar: {
    width: 90,
    backgroundColor: "#10464d",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },

  // MOBILE BAR
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: "#10464d",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  navButton: {
    padding: 10,
  },
});