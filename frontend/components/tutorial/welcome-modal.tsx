import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTutorial } from "@/context/tutorial-context";
import { styles } from "@/styles/tutorial-styles";

const TEAL = "#1F6A6A";

export function WelcomeModal() {
  const { showWelcome, setShowWelcome, startTutorial } = useTutorial();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.88, 380);

  return (
    <Modal visible={showWelcome} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.welcomeOverlay}>
        <View style={[styles.welcomeCard, { width: cardWidth }]}>
          <View style={styles.welcomeBubbles} pointerEvents="none">
            <View style={[styles.welcomeBubble, { top: 10, left: 14, width: 10, height: 10 }]} />
            <View style={[styles.welcomeBubble, { top: 22, left: 28, width: 6, height: 6 }]} />
            <View style={[styles.welcomeBubble, { top: 12, right: 18, width: 8, height: 8 }]} />
            <View style={[styles.welcomeBubble, { top: 26, right: 30, width: 5, height: 5 }]} />
          </View>

          <View style={styles.welcomeIconWrap}>
            <Ionicons name="calendar" size={32} color="#ffffff" />
          </View>

          <Text style={styles.welcomeTitle}>Welcome aboard! 🎉</Text>
          <Text style={styles.welcomeSubtitle}>
            Would you like a quick tour to discover everything you can do?
          </Text>

          <View style={styles.welcomeFeatureList}>
            {[
              { icon: "home-outline", label: "Your personal calendar" },
              { icon: "search-outline", label: "Discover public calendars" },
              { icon: "compass-outline", label: "Events near you on the map" },
              { icon: "add-circle-outline", label: "Create events & calendars" },
            ].map((f) => (
              <View key={f.icon} style={styles.welcomeFeatureRow}>
                <Ionicons name={f.icon as any} size={16} color={TEAL} />
                <Text style={styles.welcomeFeatureText}>{f.label}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.welcomeBtnPrimary} onPress={startTutorial}>
            <Text style={styles.welcomeBtnPrimaryText}>Yes, show me around →</Text>
          </Pressable>

          <Pressable style={styles.welcomeBtnSecondary} onPress={() => setShowWelcome(false)}>
            <Text style={styles.welcomeBtnSecondaryText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}