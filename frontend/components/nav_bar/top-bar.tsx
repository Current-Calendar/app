import React from "react";
import { View, Pressable, StyleSheet, Image } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

export default function TopBar() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {user}=useAuth();
  const goProfileOrLogin = () => {
    router.push((isAuthenticated ? `/profile/${user?.id}` : "/login") as Href);
  };

  return (
    <View style={styles.topBar}>
      <Pressable style={styles.profileContainer} onPress={goProfileOrLogin}>
        <View style={styles.profileAvatar} />
      </Pressable>

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/icon-current-white.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.sidePlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 60,
    backgroundColor: "#10464d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  logoContainer: { alignItems: "center", justifyContent: "center" },
  sidePlaceholder: { width: 35 },
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
  logo: { width: 120, height: 40 },
});