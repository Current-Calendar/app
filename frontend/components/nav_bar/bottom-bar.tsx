import React, { useState } from "react";
import { View, Pressable, StyleSheet, Modal, Text, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface Props {
  NavButton: any;
}

export default function BottomBar({ NavButton }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();

  const handleAddPress = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const navigateTo = (path: string) => {
    closeMenu();
    router.push(path as any);
  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <View style={styles.bottomBar}>
      <NavButton icon="home" href="/calendars" />
      <NavButton icon="search" href="/search" />
      <NavButton icon="add-circle" onPress={handleAddPress} />
      <NavButton icon="calendar-clear" href="/calendar-view" />
      <NavButton icon="calendar" href="/switch-calendar" />
      <NavButton icon="chatbubble-ellipses" />
      <NavButton icon="compass" href="/radar" />

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
                onPress={() => navigateTo("/events/create_events")}
              >
                <View style={[styles.iconBg, { backgroundColor: "#10464d" }]}>
                  <Ionicons name="add" size={24} color="#fff" />
                </View>
                <Text style={styles.menuItemText}>New Event</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => navigateTo("/modal")}
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
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 60,
    backgroundColor: "#10464d",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 35,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
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
  closeBtn: {
    marginTop: 10,
    padding: 10,
  },
});