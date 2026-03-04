import { View, Pressable, StyleSheet, Image, Modal, Text, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

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
    label,
    href,
    onPress,
  }: {
    icon: any;
    label: string;
    href?: string;
    onPress?: () => void;
  }) => {
    const content = (
      <Pressable style={styles.sidebarItem} onPress={onPress}>
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

  // lógica Profile/Login
  const profileLabel = isAuthenticated ? "Profile" : "Login";
  const profileHref: Href = isAuthenticated ? (`/profile/${user?.id}` as Href) : ("/login" as Href);


  return (
    <View style={[styles.sidebar]}>
      {/* TOP */}
      <View style={styles.sidebarTop}>
        <Image
          source={require("../../assets/images/icon-current-white.png")}
          style={[styles.sidebarLogo]}
          resizeMode="contain"
        />
      </View>

      {/* CENTER */}
      <View style={styles.sidebarCenter}>
        <SidebarItem icon="home" label="Home" href="/(tabs)/calendars" />
        <SidebarItem icon="search" label="Search" href="/(tabs)/search" />
        <SidebarItem icon="add-circle" label="Create" onPress={handleAddPress} />
        <SidebarItem icon="calendar" label="Discover" href="/(tabs)/switch-calendar" />
        <SidebarItem icon="people" label="Our Team" />
        <SidebarItem icon="compass" label="Map" href="/radar" />
        <SidebarItem icon="person" label={profileLabel} href={profileHref} />

        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={styles.overlay}>
              <View style={styles.menuContainer}>
                <Text style={styles.menuTitle}>Create New</Text>

                <Pressable
                  style={styles.menuItem}
                  onPress={() => navigateTo(`/create_events?date=${getTodayFormatted()}`)}
                >
                  <View style={[styles.iconBg, { backgroundColor: "#10464d" }]}>
                    <Ionicons name="add" size={24} color="#fff" />
                  </View>
                  <Text style={styles.menuItemText}>New Event</Text>
                </Pressable>

                <Pressable
                  style={styles.menuItem}
                  onPress={() => navigateTo("/create")}
                >
                  <View style={[styles.iconBg, { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#10464d" }]}>
                    <Ionicons name="calendar-outline" size={22} color="#10464d" />
                  </View>
                  <Text style={styles.menuItemText}>New Calendar</Text>
                </Pressable>

                <Pressable style={styles.closeBtn} onPress={closeMenu}>
                  <Ionicons name="close" size={24} color="#888" />
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 80,
    backgroundColor: "#10464d",
    paddingVertical: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  menuContainer: {
    width: 250,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 15,
  },

  menuTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#888",
    marginBottom: 20,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 15,
  },

  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  menuItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10464d",
  },

  sidebarTop: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },

  sidebarLogo: {
    width: 50,
    height: 50,
  },

  sidebarCenter: {
    flex: 1,
    justifyContent: "center",
    gap: 30,
  },

  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },

  sidebarText: {
    color: "#ffffff",
    fontSize: 18,
  },

  closeBtn: {
    marginTop: 10,
    padding: 10,
  },
});