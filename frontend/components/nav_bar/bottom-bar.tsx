import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { ImportCalendarModal } from '@/components/import-calendar-modal';
import { navBottomBarStyles } from "@/styles/ui-styles";
import { CreateMenuModal } from "@/components/nav_bar/create-menu-modal";

interface Props {
  NavButton: any;
}

export default function BottomBar({ NavButton }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const [importVisible, setImportVisible] = useState(false);

  const handleAddPress = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const navigateTo = (path: string) => {
    closeMenu();
    router.push(path as any);
  };

  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <View style={navBottomBarStyles.bottomBar}>
      <NavButton icon="home" href="/calendars" />
      <NavButton icon="search" href="/search" />
      <NavButton icon="add-circle" onPress={handleAddPress} />
      <NavButton icon="calendar" href="/switch-calendar" />
      <NavButton icon="people"  />
      <NavButton icon="compass" href="/radar" />

      <CreateMenuModal
        visible={menuVisible}
        onClose={closeMenu}
        onNewEvent={() => navigateTo(`/create_events?date=${getTodayFormatted()}`)}
        onNewCalendar={() => navigateTo("/create")}
        onImportCalendar={() => { closeMenu(); setImportVisible(true); }}
      />

      <ImportCalendarModal visible={importVisible} onClose={() => setImportVisible(false)} />
    </View>
  );
}