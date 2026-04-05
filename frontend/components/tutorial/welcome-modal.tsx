import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTutorial } from "@/context/tutorial-context";

const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const PINK = "#F2A3A6";
const TEXT = "#10464D";

export function WelcomeModal() {
  const { showWelcome, setShowWelcome, startTutorial } = useTutorial();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.88, 380);

  return (
    <Modal visible={showWelcome} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: cardWidth }]}>
          <View style={styles.bubbles} pointerEvents="none">
            <View style={[styles.bubble, { top: 10, left: 14, width: 10, height: 10 }]} />
            <View style={[styles.bubble, { top: 22, left: 28, width: 6, height: 6 }]} />
            <View style={[styles.bubble, { top: 12, right: 18, width: 8, height: 8 }]} />
            <View style={[styles.bubble, { top: 26, right: 30, width: 5, height: 5 }]} />
          </View>

          <View style={styles.iconWrap}>
            <Ionicons name="calendar" size={32} color="#ffffff" />
          </View>

          <Text style={styles.title}>Welcome aboard! 🎉</Text>
          <Text style={styles.subtitle}>
            Would you like a quick tour to discover everything you can do?
          </Text>

          <View style={styles.featureList}>
            {[
              { icon: "home-outline", label: "Your personal calendar" },
              { icon: "search-outline", label: "Discover public calendars" },
              { icon: "compass-outline", label: "Events near you on the map" },
              { icon: "add-circle-outline", label: "Create events & calendars" },
            ].map((f) => (
              <View key={f.icon} style={styles.featureRow}>
                <Ionicons name={f.icon as any} size={16} color={TEAL} />
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.btnPrimary} onPress={startTutorial}>
            <Text style={styles.btnPrimaryText}>Yes, show me around →</Text>
          </Pressable>

          <Pressable style={styles.btnSecondary} onPress={() => setShowWelcome(false)}>
            <Text style={styles.btnSecondaryText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 40, 40, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    overflow: "hidden",
    position: "relative",
  },
  bubbles: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(31, 106, 106, 0.2)",
    backgroundColor: "rgba(242, 163, 166, 0.08)",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: TEAL,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  featureList: {
    width: "100%",
    marginBottom: 24,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    color: TEXT,
    opacity: 0.8,
  },
  btnPrimary: {
    width: "100%",
    backgroundColor: TEAL,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: TEAL_DARK,
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.2,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  btnPrimaryText: {
    color: "#EAF7F6",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  btnSecondary: {
    paddingVertical: 8,
  },
  btnSecondaryText: {
    color: PINK,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});