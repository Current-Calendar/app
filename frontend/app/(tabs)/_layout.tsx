import { Slot } from "expo-router";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWindowDimensions } from "react-native";
import { Link, type Href } from "expo-router";
import { useState } from "react";
import TopBar from "../../components/nav_bar/top-bar";
import BottomBar from "../../components/nav_bar/bottom-bar";
import Sidebar from "../../components/nav_bar/side-bar";

export default function CustomTabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [expanded, setExpanded] = useState(false);

  const NavButton = ({
    icon,
    href,
  }: {
    icon: any;
    href?: any;
  }) => {
    const button = (
      <Pressable style={styles.navButton}>
        <Ionicons name={icon} size={24} color="#ffffff" />
      </Pressable>
    );

    if (href) {
      return (
        <Link href={href} asChild>
          {button}
        </Link>
      );
    }

    return button;
  };

  return (
    <View style={styles.container}>
      {/* WEB SIDEBAR */}
      {isDesktop && (
        <Sidebar expanded={expanded} setExpanded={setExpanded} />
      )}

      {/* MOBILE TOP BAR */}
      <View style={styles.content}>
        {!isDesktop && <TopBar />}

        <Slot />
      </View>

      {/* MOBILE BOTTOM BAR */}
      {!isDesktop && <BottomBar NavButton={NavButton} />}
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
  navButton: {
    padding: 10,
  },
});