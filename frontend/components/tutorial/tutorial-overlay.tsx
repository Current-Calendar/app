import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTutorial } from "@/context/tutorial-context";

const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const TEXT = "#10464D";
const BOTTOM_BAR_HEIGHT = 64;

export function TutorialOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, endTutorial } = useTutorial();
  const { width } = useWindowDimensions();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
    }
  }, [isActive, currentStep]);

  if (!isActive) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const cardWidth = Math.min(width - 32, 420);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[styles.card, { width: cardWidth, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          pointerEvents="box-none"
        >
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon as any} size={18} color="#ffffff" />
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>
                {currentStep + 1} / {steps.length}
              </Text>
            </View>
            <Pressable onPress={endTutorial} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={18} color={TEXT} />
            </Pressable>
          </View>

          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          <View style={styles.buttons}>
            <Pressable
              onPress={prevStep}
              style={[styles.btnSecondary, isFirst && styles.btnDisabled]}
              disabled={isFirst}
            >
              <Ionicons name="arrow-back" size={14} color={isFirst ? "#ccc" : TEAL} />
              <Text style={[styles.btnSecondaryText, isFirst && { color: "#ccc" }]}>Back</Text>
            </Pressable>

            <Pressable onPress={nextStep} style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>{isLast ? "Finish 🎉" : "Next"}</Text>
              {!isLast && <Ionicons name="arrow-forward" size={14} color="#EAF7F6" />}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: BOTTOM_BAR_HEIGHT + 12,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "rgba(31,106,106,0.12)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: TEAL,
    justifyContent: "center",
    alignItems: "center",
  },
  stepBadge: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(31,106,106,0.08)",
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  stepText: { fontSize: 11, fontWeight: "700", color: TEAL, letterSpacing: 0.5 },
  closeBtn: { padding: 4 },
  dots: { flexDirection: "row", gap: 5, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(31,106,106,0.2)" },
  dotActive: { width: 18, backgroundColor: TEAL },
  title: { fontSize: 17, fontWeight: "800", color: TEXT, marginBottom: 6 },
  description: { fontSize: 13, color: TEXT, opacity: 0.75, lineHeight: 19, marginBottom: 16 },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: TEAL,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: TEAL_DARK,
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  btnPrimaryText: { color: "#EAF7F6", fontWeight: "800", fontSize: 13 },
  btnSecondary: {
    flex: 0.5,
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "rgba(31,106,106,0.25)",
  },
  btnSecondaryText: { color: TEAL, fontWeight: "700", fontSize: 13 },
  btnDisabled: { borderColor: "#e0e0e0" },
});