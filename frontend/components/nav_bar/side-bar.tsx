import { View, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ImportCalendarModal } from '@/components/import-calendar-modal';
import { navSideBarStyles } from "@/styles/ui-styles";
import { CreateMenuModal } from "@/components/nav_bar/create-menu-modal";
import { useNotificationsContext } from "@/context/notification-context";

const SidebarItem = ({
  icon,
  onPress,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
}) => (
  <Pressable style={navSideBarStyles.sidebarItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color="#ffffff" />
  </Pressable>
);

export default function Sidebar() {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [importVisible, setImportVisible] = useState(false);
  const { unreadCount } = useNotificationsContext();

  const handleAddPress = () => {
    if (isAuthenticated) {
      setMenuVisible(true);
    } else {
      router.push("/login");
    }
  };
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

  const profileHref: string = isAuthenticated ? "/profile" : "/login";
  const homeHref: string = isAuthenticated ? "/calendars" : "/login";
  const notificationsHref: string = isAuthenticated ? "/(tabs)/notifications" : "/login";

  return (
    <View style={navSideBarStyles.sidebar}>
      <View style={navSideBarStyles.sidebarTop}>
        <Pressable onPress={() => router.push("/calendars")}>
          <Image
            source={require("../../assets/images/icon-current-white.png")}
            style={navSideBarStyles.sidebarLogo}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      <View style={navSideBarStyles.sidebarCenter}>
        <SidebarItem icon="home" label="Home" onPress={() => router.push(homeHref as any)} />
        <SidebarItem icon="search" label="Search" onPress={() => router.push("/(tabs)/search" as any)} />
        <SidebarItem icon="add-circle" label="Create" onPress={handleAddPress} />
        <SidebarItem icon="calendar" label="Discover" onPress={() => router.push("/(tabs)/switch-calendar" as any)} />
        <SidebarItem icon="compass" label="Map" onPress={() => router.push("/radar" as any)} />
        <View style={{ position: "relative" }}>
          <SidebarItem icon="notifications" label="Notifications" onPress={() => router.push(notificationsHref as any)} />
          {unreadCount > 0 && (
            <View style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: "#e53935",
              borderWidth: 1.5,
              borderColor: "#10464d",
              pointerEvents: "none",
            }} />
          )}
        </View>
        <SidebarItem icon="person" label="Profile" onPress={() => router.push(profileHref as any)} />
        {user?.plan === 'BUSINESS' && (
          <SidebarItem icon="bar-chart" label="Analytics" onPress={() => router.push("/(tabs)/analytics" as any)} />
        )}
      </View>

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
      <ImportCalendarModal visible={importVisible} onClose={() => setImportVisible(false)} />
    </View>
  );
}
