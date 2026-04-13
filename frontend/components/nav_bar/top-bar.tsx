import React from "react";
import { View, Pressable, Image, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { navTopBarStyles } from "@/styles/ui-styles";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "@/hooks/use-notifications";

export default function TopBar() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const goProfileOrLogin = () => {
    router.push((isAuthenticated ? "/profile" : "/login") as Href);
  };

  const goNotificationsOrLogin = () => {
    router.push((isAuthenticated ? "/(tabs)/notifications" : "/login") as Href);
  };

  return (
    <View style={navTopBarStyles.topBar}>
      <Pressable style={navTopBarStyles.profileContainer} onPress={goProfileOrLogin}>
        <View style={navTopBarStyles.profileAvatar} />
      </Pressable>

      <View style={navTopBarStyles.logoContainer}>
        <Image
          source={require("../../assets/images/icon-current-white.png")}
          style={navTopBarStyles.logo}
          resizeMode="contain"
        />
      </View>
      <Pressable
        style={styles.bellWrap}
        onPress={goNotificationsOrLogin}
      >
        <Ionicons name="notifications-outline" size={22} color="#ffffff" />
        {unreadCount > 0 && <View style={styles.badge} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bellWrap: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#e53935",
    borderWidth: 1.5,
    borderColor: "#10464d",
  },
});
