import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { ImportCalendarModal } from "@/components/import-calendar-modal";
import { navBottomBarStyles } from "@/styles/ui-styles";
import { CreateMenuModal } from "@/components/nav_bar/create-menu-modal";
import { useAuth } from "@/hooks/use-auth";
import { useTutorial } from "@/context/tutorial-context";

interface Props {
  NavButton: any;
}

export default function BottomBar({ NavButton }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const [importVisible, setImportVisible] = useState(false);
  const { isAuthenticated } = useAuth();
  const { createButtonLayout } = useTutorial();

  const handleAddPress = () => {
    if (isAuthenticated) {
      setMenuVisible(true);
      return;
    }

    router.push("/login" as any);
  };
  const closeMenu = () => setMenuVisible(false);

  const navigateTo = (path: string) => {
    closeMenu();
    router.push(path as any);
  };

  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <View style={navBottomBarStyles.bottomBar}>
      <NavButton
        icon="home"
        onPress={() => {
          router.push((isAuthenticated ? "/calendars" : "/login") as any);
        }}
      />
      <NavButton icon="search" href="/search" />

      <View
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          createButtonLayout.current = { x, y, width, height };
        }}
      >
        <NavButton icon="add-circle" onPress={handleAddPress} />
      </View>

      <NavButton icon="calendar" href="/switch-calendar" />
      <NavButton icon="people" />
      <NavButton icon="compass" href="/radar" />

      <CreateMenuModal
        visible={menuVisible}
        onClose={closeMenu}
        onNewEvent={() => {
          if (isAuthenticated) {
            navigateTo(`/create_events?date=${getTodayFormatted()}`);
          } else {
            closeMenu();
            router.push("/login");
          }
        }}
        onNewCalendar={() => {
          if (isAuthenticated) {
            navigateTo("/create");
          } else {
            closeMenu();
            router.push("/login");
          }
        }}
        onImportCalendar={() => {
          if (isAuthenticated) {
            closeMenu();
            setImportVisible(true);
          } else {
            closeMenu();
            router.push("/login");
          }
        }}
      />

      <ImportCalendarModal
        visible={importVisible}
        onClose={() => setImportVisible(false)}
      />
    </View>
  );
}
