import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { APP_BACKGROUND, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AuthProvider from "../context/auth-context";
import { TutorialProvider } from "@/context/tutorial-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

const COOKIE_PREFERENCE_KEY = "current_cookie_preference";
type CookiePreference = "accepted" | "rejected";

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [cookiePreference, setCookiePreference] = useState<CookiePreference | null>(null);
  const [cookiePreferenceChecked, setCookiePreferenceChecked] = useState(Platform.OS !== "web");
  const [cookiePreferenceRaw, setCookiePreferenceRaw] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      const saved = window.localStorage.getItem(COOKIE_PREFERENCE_KEY);
      setCookiePreferenceRaw(saved);
      if (saved === "accepted" || saved === "rejected") {
        setCookiePreference(saved);
      }
    } catch {
      // Ignore localStorage access errors in restricted browser contexts.
    } finally {
      setCookiePreferenceChecked(true);
    }
  }, []);

  const saveCookiePreference = (value: CookiePreference) => {
    setCookiePreference(value);
    if (Platform.OS !== "web") return;
    try {
      window.localStorage.setItem(COOKIE_PREFERENCE_KEY, value);
      setCookiePreferenceRaw(value);
    } catch {
      // Ignore localStorage write errors.
    }
  };

  const refreshCookiePreferenceDebug = () => {
    if (Platform.OS !== "web") return;
    try {
      const saved = window.localStorage.getItem(COOKIE_PREFERENCE_KEY);
      setCookiePreferenceRaw(saved);
    } catch {
      setCookiePreferenceRaw("<storage-error>");
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
    <AuthProvider>
      <TutorialProvider>
        <ThemeProvider value={colorScheme === "dark" ? darkTheme : lightTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="new-password" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
          </Stack>
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
          {Platform.OS === "web" && (
            <View style={styles.cookieDebugBox}>
              <Text style={styles.cookieDebugTitle}>Cookie debug</Text>
              <Text style={styles.cookieDebugLine}>
                key: {COOKIE_PREFERENCE_KEY}
              </Text>
              <Text style={styles.cookieDebugLine}>
                localStorage: {cookiePreferenceRaw ?? "<null>"}
              </Text>
              <Text style={styles.cookieDebugLine}>
                state: {cookiePreference ?? "<null>"}
              </Text>
              <Text style={styles.cookieDebugLine}>
                checked: {cookiePreferenceChecked ? "true" : "false"}
              </Text>
              <Pressable style={styles.cookieDebugButton} onPress={refreshCookiePreferenceDebug}>
                <Text style={styles.cookieDebugButtonText}>Refresh debug</Text>
              </Pressable>
            </View>
          )}
          <StatusBar style="auto" />
        </ThemeProvider>
      </TutorialProvider>
    </AuthProvider>
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
  cookieDebugBox: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1000,
    backgroundColor: "rgba(12, 28, 32, 0.92)",
    borderWidth: 1,
    borderColor: "#3f6660",
    borderRadius: 10,
    padding: 10,
    minWidth: 220,
    gap: 2,
  },
  cookieDebugTitle: {
    color: "#f2a3a6",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },
  cookieDebugLine: {
    color: "#d7f0ec",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  cookieDebugButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#7bb9b3",
  },
  cookieDebugButtonText: {
    color: "#d7f0ec",
    fontSize: 10,
    fontWeight: "800",
  },
});