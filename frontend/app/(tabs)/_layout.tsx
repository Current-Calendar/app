import { Ionicons } from "@expo/vector-icons";
import { Href, Link, Slot } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Sidebar from "../../components/nav_bar/side-bar"
import BottomBar from "../../components/nav_bar/bottom-bar"
import TopBar from "../../components/nav_bar/top-bar"

export default function CustomTabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [expanded, setExpanded] = useState(false);

  const NavButton = ({ icon, href, onPress }: { icon: any; href?: Href; onPress?: () => void }) => {
    const button = (
      <Pressable style={styles.navButton} onPress={onPress}>
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
      {/* --- WEB SIDEBAR --- */}
      {isDesktop && <Sidebar expanded={expanded} setExpanded={setExpanded} />}

      {/* --- MAIN CONTENT --- */}
      <View style={styles.content}>
        {/* TOP BAR (Mobile only) */}
        {!isDesktop && (
          <TopBar />
        )}

        {/* Renders the current screen */}
        <Slot />

        {/* BOTTOM BAR (Mobile only) */}
        {!isDesktop && (
          <BottomBar NavButton={NavButton} />
        )}
      </View>
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
    backgroundColor: "#FFFDED",
  },
  navButton: {
    padding: 10,
  },
});