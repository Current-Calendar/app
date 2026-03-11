import { View, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { navSideBarStyles } from "@/styles/ui-styles";
import { CreateMenuModal } from "@/components/nav_bar/create-menu-modal";

export default function Sidebar() {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleAddPress = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const navigateTo = (path: string) => {
    closeMenu();
    router.push(path as any);
  };

  const { user } = useAuth();

  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const SidebarItem = ({
    icon,
    href,
    onPress,
  }: {
    icon: any;
    label: string;
    href?: string;
    onPress?: () => void;
  }) => {
    const content = (
      <Pressable style={navSideBarStyles.sidebarItem} onPress={onPress}>
        <Ionicons name={icon} size={22} color="#ffffff" />
      </Pressable>
    );

    if (href) {
      return (
        <Link href={href as Href} asChild>
          {content}
        </Link>
      );
    }

    return content;
  };

  const profileLabel = isAuthenticated ? "Profile" : "Login";
  const profileHref: string = isAuthenticated ? `/profile/${user?.id}` : "/login";

  return (
    <View style={navSideBarStyles.sidebar}>
      <View style={navSideBarStyles.sidebarTop}>
        <Image
          source={require("../../assets/images/icon-current-white.png")}
          style={navSideBarStyles.sidebarLogo}
          resizeMode="contain"
        />
      </View>

      <View style={navSideBarStyles.sidebarCenter}>
        <SidebarItem icon="home" label="Home" href="/(tabs)/calendars" />
        <SidebarItem icon="search" label="Search" href="/(tabs)/search" />
        <SidebarItem icon="add-circle" label="Create" onPress={handleAddPress} />
        <SidebarItem icon="calendar" label="Discover" href="/(tabs)/switch-calendar" />
        <SidebarItem icon="people" label="Our Team" />
        <SidebarItem icon="compass" label="Map" href="/radar" />
        <SidebarItem icon="person" label={profileLabel} href={profileHref} />

        <CreateMenuModal
          visible={menuVisible}
          onClose={closeMenu}
          onNewEvent={() => navigateTo(`/create_events?date=${getTodayFormatted()}`)}
          onNewCalendar={() => navigateTo("/create")}
        />

      </View>
    </View>
  );
}

