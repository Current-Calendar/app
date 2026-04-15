import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CustomToastProps {
  message: string | null;
  onHide: () => void;
  duration?: number;
  type?: "success" | "error" | "info";
}

export default function CustomToast({
  message,
  onHide,
  duration = 3000,
  type = "error",
}: CustomToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;

  // Change background color based on type if needed, defaulted to main for now
  const backgroundColor = type === "error" ? "#d9534f" : "#10464d";

  useEffect(() => {
    if (message) {
      const topOffset = Platform.OS === "web" ? 20 : Math.max(insets.top, 20);

      Animated.sequence([
        Animated.timing(translateY, {
          toValue: topOffset,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(translateY, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    } else {
      translateY.setValue(-150);
    }
  }, [message, insets.top, duration, onHide, translateY]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        { transform: [{ translateY }], backgroundColor: "#10464d" }, // Keep your styled color
      ]}
      pointerEvents="none"
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "85%",
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
