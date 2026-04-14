import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { APP_BACKGROUND, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/use-auth";
import AuthProvider from "../context/auth-context";
import { TutorialProvider } from "@/context/tutorial-context";
import { usePathname, useSegments } from "expo-router";
import { getRouteProtection } from "../routes-config";

export const unstable_settings = {
  anchor: "(tabs)",
};

const queryClient = new QueryClient();
const COOKIE_PREFERENCE_KEY = "current_cookie_preference";
const COOKIE_PREFERENCE_TTL_DAYS = 180;
type CookiePreference = "accepted" | "rejected";

type CookiePreferenceStorage = {
  value: CookiePreference;
  acceptedAt: string;
  expiresAt: string;
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TutorialProvider>
          <RootLayoutContent />
        </TutorialProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutContent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const [cookiePreference, setCookiePreference] = useState<CookiePreference | null>(null);
  const [cookiePreferenceChecked, setCookiePreferenceChecked] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (isLoading) return;
    try {
      const saved = window.localStorage.getItem(COOKIE_PREFERENCE_KEY);
      if (!saved) {
        return;
      }

      // Backward compatibility: old plain string format without expiration.
      if (saved === "accepted" || saved === "rejected") {
        window.localStorage.removeItem(COOKIE_PREFERENCE_KEY);
        setCookiePreference(null);
        return;
      }

      const parsed = JSON.parse(saved) as CookiePreferenceStorage;
      const isValidValue = parsed?.value === "accepted" || parsed?.value === "rejected";
      const acceptedAtMs = parsed?.acceptedAt ? new Date(parsed.acceptedAt).getTime() : NaN;
      const expiry = parsed?.expiresAt ? new Date(parsed.expiresAt).getTime() : NaN;
      const isExpired = Number.isNaN(expiry) || expiry <= Date.now();
      const acceptedDate = new Date(acceptedAtMs);
      const now = new Date();
      const isDifferentDayForAnonymous =
        !isAuthenticated &&
        (Number.isNaN(acceptedAtMs) ||
          acceptedDate.getFullYear() !== now.getFullYear() ||
          acceptedDate.getMonth() !== now.getMonth() ||
          acceptedDate.getDate() !== now.getDate());

      if (!isValidValue || isExpired || isDifferentDayForAnonymous) {
        window.localStorage.removeItem(COOKIE_PREFERENCE_KEY);
        setCookiePreference(null);
        return;
      }

      setCookiePreference(parsed.value);
    } catch {
      // Ignore localStorage access errors in restricted browser contexts.
    } finally {
      setCookiePreferenceChecked(true);
    }
  }, [isAuthenticated, isLoading]);

  const protection = getRouteProtection(pathname);
  const isRedirecting = !isLoading && protection && (
    (protection.requiresAuth && !isAuthenticated) ||
    (protection.requiresGuest && isAuthenticated)
  );

  useEffect(() => {
    if (isLoading) return;

    if (protection) {
      if (protection.requiresAuth && !isAuthenticated) {
        router.replace(protection.redirectOnFail as any);
      } else if (protection.requiresGuest && isAuthenticated) {
        router.replace(protection.redirectOnFail as any);
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const saveCookiePreference = (value: CookiePreference) => {
    setCookiePreference(value);
    if (Platform.OS !== "web") return;
    try {
      const acceptedAt = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + COOKIE_PREFERENCE_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      const payload: CookiePreferenceStorage = { value, acceptedAt, expiresAt };
      const serialized = JSON.stringify(payload);
      window.localStorage.setItem(COOKIE_PREFERENCE_KEY, serialized);
    } catch {
      // Ignore localStorage write errors.
    }
  };
  const lightTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: APP_BACKGROUND },
  };
  const darkTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: Colors.dark.background },
  };

  return (
    <ThemeProvider value={colorScheme === "dark" ? darkTheme : lightTheme}>
      <View style={{ flex: 1, opacity: isRedirecting ? 0 : 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="new-password" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        </Stack>
      </View>
      {Platform.OS === "web" && cookiePreferenceChecked && cookiePreference === null && (
        <View style={styles.cookieBanner}>
          <View style={styles.cookieTextWrap}>
            <Text style={styles.cookieTitle}>This website uses cookies</Text>
            <Text style={styles.cookieBody}>
              We use essential cookies for functionality and optional cookies for analytics.
            </Text>
            <Pressable onPress={() => router.push("/cookies" as any)}>
              <Text style={styles.cookieLink}>Read the Cookies Policy</Text>
            </Pressable>
          </View>

          <View style={styles.cookieActions}>
            <Pressable
              style={[styles.cookieButton, styles.cookieSecondaryButton]}
              onPress={() => saveCookiePreference("rejected")}
            >
              <Text style={styles.cookieSecondaryButtonText}>Reject</Text>
            </Pressable>
            <Pressable
              style={[styles.cookieButton, styles.cookieSecondaryButton]}
              onPress={() => router.push("/privacy-settings" as any)}
            >
              <Text style={styles.cookieSecondaryButtonText}>Configure</Text>
            </Pressable>
            <Pressable
              style={[styles.cookieButton, styles.cookiePrimaryButton]}
              onPress={() => saveCookiePreference("accepted")}
            >
              <Text style={styles.cookiePrimaryButtonText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  cookieBanner: {
    position: "fixed",
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 999,
    backgroundColor: "#10464d",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0b353a",
    padding: 14,
    gap: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cookieTextWrap: {
    gap: 4,
  },
  cookieTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  cookieBody: {
    color: "#d7f0ec",
    fontSize: 13,
    lineHeight: 18,
  },
  cookieLink: {
    color: "#f2a3a6",
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
    marginTop: 2,
  },
  cookieActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  cookieButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  cookiePrimaryButton: {
    backgroundColor: "#f2a3a6",
    borderColor: "#f2a3a6",
  },
  cookieSecondaryButton: {
    backgroundColor: "transparent",
    borderColor: "#7bb9b3",
  },
  cookiePrimaryButtonText: {
    color: "#0f4e4f",
    fontWeight: "800",
    fontSize: 12,
  },
  cookieSecondaryButtonText: {
    color: "#d7f0ec",
    fontWeight: "700",
    fontSize: 12,
  },
});