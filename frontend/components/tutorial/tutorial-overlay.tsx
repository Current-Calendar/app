import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTutorial } from "@/context/tutorial-context";
import { styles } from "@/styles/tutorial-styles";

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
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
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
              <Ionicons name="close" size={18} color="#10464D" />
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
              <Ionicons name="arrow-back" size={14} color={isFirst ? "#ccc" : "#1F6A6A"} />
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