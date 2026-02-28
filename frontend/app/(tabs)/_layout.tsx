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

  const SidebarItem = ({
    icon,
    label,
    expanded,
    href,
  }: {
    icon: any;
    label: string;
    expanded: boolean;
    href?: Href;
  }) => {
    const content = (
      <Pressable style={styles.sidebarItem}>
        <Ionicons name={icon} size={22} color="#ffffff" />
        {expanded && <Text style={styles.sidebarText}>{label}</Text>}
      </Pressable>
    );

    if (href) {
      return (
        <Link href={href} asChild>
          {content}
        </Link>
      );
    }
    return content;
  };

  return (
    <View style={styles.container}>
      {/* --- WEB SIDEBAR --- */}
      {isDesktop && (
        <View
          style={[
            styles.sidebar,
            expanded && styles.sidebarExpanded,
          ]}
        >
          {/* TOP: Logo */}
          <View style={styles.sidebarTop}>
          <Link href="/login" asChild>
            <Pressable>
              <Image
                source={require("../../assets/images/icon-current-white.png")}
                style={[
                  styles.sidebarLogo,
                  expanded && styles.sidebarLogoExpanded,
                ]}
                resizeMode="contain"
              />
            </Pressable>
          </Link>
        </View>

          {/* CENTER: Iconos */}
          <View style={styles.sidebarCenter}>
            <SidebarItem icon="home" label="Home" expanded={expanded} href="/" />
            <SidebarItem icon="search" label="Search" expanded={expanded} href="/search" />
            <SidebarItem icon="calendar" label="Calendars" expanded={expanded} href="/calendars" />
            <SidebarItem icon="people" label="Our Team" expanded={expanded} />
            <SidebarItem icon="compass" label="Map" expanded={expanded} />
            <SidebarItem icon="settings" label="Settings" expanded={expanded} />
            <SidebarItem icon="person" label="Profile" expanded={expanded} />
          </View>

          {/* BOTTOM: Botón Expandir */}
          <Pressable
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
          >
            <Ionicons
              name={expanded ? "chevron-back" : "chevron-forward"}
              size={22}
              color="#ffffff"
            />
          </Pressable>
        </View>
      )}

      {/* --- CONTENIDO PRINCIPAL --- */}
      <View style={styles.content}>
        {/* TOP BAR (Solo Mobile) */}
        {!isDesktop && (
          <View style={styles.topBar}>
            <Pressable style={styles.profileContainer}>
              <View style={styles.profileAvatar} />
            </Pressable>

            <Link href="/login" asChild>
              <Pressable style={styles.logoContainer}>
                <Image
                  source={require("../../assets/images/icon-current-white.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Pressable>
            </Link>

            <View style={styles.sidePlaceholder} />
          </View>
        )}

        {/* Renderiza la pantalla actual */}
        <Slot />

        {/* BOTTOM BAR (Solo Mobile) */}
        {!isDesktop && (
          <View style={styles.bottomBar}>
            <NavButton icon="home" href="/" />
            <NavButton icon="search" href="/search" />
            <NavButton icon="add-circle" />
            <NavButton icon="chatbubble-ellipses" />
            <NavButton icon="compass" />
          </View>
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
  // MOBILE BAR
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
  topBar: {
    height: 60,
    backgroundColor: "#10464d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  sidePlaceholder: {
    width: 35,
  },
  profileContainer: {
    width: 35,
    height: 35,
    borderRadius: 18,
    overflow: "hidden",
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ccc",
    borderRadius: 18,
  },
  logo: {
    width: 120,
    height: 40,
  },
  // SIDEBAR (WEB)
  sidebar: {
    width: 80,
    backgroundColor: "#10464d",
    paddingVertical: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  sidebarExpanded: {
    width: 170,
    alignItems: "flex-start",
    paddingLeft: 20,
  },
  sidebarTop: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  sidebarLogo: {
    width: 50,
    height: 50,
  },
  sidebarLogoExpanded: {
    width: 110,
    height: 110,
    transform: [{ translateX: -10 }],
  },
  sidebarCenter: {
    flex: 1,
    justifyContent: "center",
    gap: 30,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  sidebarText: {
    color: "#ffffff",
    fontSize: 18,
  },
  expandButton: {
    marginBottom: 10,
  },
  navButton: {
    padding: 10,
  },
});