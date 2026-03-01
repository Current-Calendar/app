import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, Slot, Href } from "expo-router";
import Sidebar from "../../components/nav_bar/side-bar"
import BottomBar from "../../components/nav_bar/bottom-bar"
import TopBar from "../../components/nav_bar/top-bar"

export default function CustomTabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [expanded, setExpanded] = useState(false);

  const NavButton = ({ icon, href }: { icon: any; href?: Href }) => {
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
      {/* --- WEB SIDEBAR --- */}
      {isDesktop && <Sidebar expanded={expanded} setExpanded={setExpanded} />}

      {/* --- CONTENIDO PRINCIPAL --- */}
      <View style={styles.content}>
        {/* TOP BAR (Solo Mobile) */}
        {!isDesktop && (
          <TopBar />
        )}

        {/* Renderiza la pantalla actual */}
        <Slot />

        {/* BOTTOM BAR (Solo Mobile) */}
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
    backgroundColor: "#E8E5D8",
  },
  navButton: {
    padding: 10,
  },
});