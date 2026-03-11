import React from "react";
import { View, Pressable, Image } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { navTopBarStyles } from "@/styles/ui-styles";

export default function TopBar() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const goProfileOrLogin = () => {
    router.push((isAuthenticated ? "/" : "/login") as Href);
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

      <View style={navTopBarStyles.sidePlaceholder} />
    </View>
  );
}

