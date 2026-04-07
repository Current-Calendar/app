import { Ionicons } from "@expo/vector-icons";
import { Href, Link, Slot, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from "react-native";
import { APP_BACKGROUND } from "@/constants/theme";
import Sidebar from "../../components/nav_bar/side-bar";
import BottomBar from "../../components/nav_bar/bottom-bar";
import TopBar from "../../components/nav_bar/top-bar";
import { useAuth } from "@/hooks/use-auth";
import { useTutorial, TUTORIAL_STEPS } from "@/context/tutorial-context";
import { WelcomeModal } from "@/components/tutorial/welcome-modal";
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay";

function InnerLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [expanded, setExpanded] = useState(false);
  const { isLoading } = useAuth();
  const router = useRouter();

  const isMounted = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { isMounted.current = true; }, 100);
    return () => clearTimeout(t);
  }, []);

  const { isActive, currentStep } = useTutorial();

  useEffect(() => {
    if (!isActive) return;
    const step = TUTORIAL_STEPS[currentStep];
    if (!step.route) return;
    if (isMounted.current) {
      router.push(step.route as any);
    } else {
      const t = setTimeout(() => router.push(step.route as any), 150);
      return () => clearTimeout(t);
    }
  }, [isActive, currentStep]);

  const NavButton = ({
    icon,
    href,
    onPress,
  }: {
    icon: any;
    href?: Href;
    onPress?: () => void;
  }) => {
    const button = (
      <Pressable style={styles.navButton} onPress={onPress}>
        <Ionicons name={icon} size={24} color="#ffffff" />
      </Pressable>
    );
    if (href) {
      return <Link href={href} asChild>{button}</Link>;
    }
    return button;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WelcomeModal />
      {isDesktop && <Sidebar expanded={expanded} setExpanded={setExpanded} />}

      <View style={styles.content}>
        {!isDesktop && <TopBar />}
        <Slot />
        {!isDesktop && <BottomBar NavButton={NavButton} />}
        <TutorialOverlay />
      </View>
    </View>
  );
}

export default function CustomTabLayout() {
  return <InnerLayout />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: APP_BACKGROUND,
  },
  content: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    position: "relative",
  },
  navButton: {
    padding: 10,
  },
});