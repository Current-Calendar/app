import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { APP_BACKGROUND, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AuthProvider from "../context/auth-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
      <ThemeProvider value={colorScheme === 'dark' ? darkTheme : lightTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="new-password" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
