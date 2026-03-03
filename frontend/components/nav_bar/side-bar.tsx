import { View, Pressable, StyleSheet, Image, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import { useAuth } from "@/context/authContext";

interface Props {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
}

export default function Sidebar({ expanded, setExpanded }: Props) {
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
    expanded,
    href,
  }: {
    icon: any;
    label: string;
    expanded: boolean;
    href?: string;
  }) => {
    const content = (
      <Pressable style={styles.sidebarItem}>
        <Ionicons name={icon} size={22} color="#ffffff" />
        {expanded && <Text style={styles.sidebarText}>{label}</Text>}
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

  return (
    <View
      style={[
        styles.sidebar,
        expanded && styles.sidebarExpanded,
      ]}
    >
      {/* TOP */}
      <View style={styles.sidebarTop}>
        <Image
          source={require("../../assets/images/icon-current-white.png")}
          style={[
            styles.sidebarLogo,
            expanded && styles.sidebarLogoExpanded,
          ]}
          resizeMode="contain"
        />
      </View>

      {/* CENTER */}
      <View style={styles.sidebarCenter}>
        <SidebarItem icon="home" label="Home" expanded={expanded} href="/(tabs)/calendars" />
        <SidebarItem icon="search" label="Search" expanded={expanded} href="/(tabs)/search" />
        <SidebarItem icon="calendar-clear" label="My Calendar" expanded={expanded} href="/(tabs)/calendar-view" />
        <SidebarItem icon="add-circle" label="Create" expanded={expanded} href={`/create_events?date=${getTodayFormatted()}`} />
        <SidebarItem icon="calendar" label="Discover" expanded={expanded}  href="/(tabs)/switch-calendar" />
        <SidebarItem icon="people" label="Our Team" expanded={expanded} />
        <SidebarItem icon="compass" label="Map" expanded={expanded} href="/radar"/>
        <SidebarItem icon="settings" label="Settings" expanded={expanded} />
        {/*<SidebarItem icon="people" label="Activity" expanded={expanded} />*/}
        {/*<SidebarItem icon="compass" label="Map" expanded={expanded} />*/}
        <SidebarItem icon="person" label="Profile" expanded={expanded} href={`/profile/${user?._id}`}/>
      </View>

      {/* BOTTOM */}
      <Pressable
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons
          name={expanded ? "chevron-back" : "chevron-forward"}
          size={22}
          color="#ffffff"
        />
      </Pressable>
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

  sidebarExpanded: {
    width: 170,
    alignItems: "flex-start",
    paddingLeft: 20,
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

  sidebarLogoExpanded: {
    width: 110,
    height: 110,
    transform: [{ translateX: -10 }],
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

  expandButton: {
    marginBottom: 10,
  },
});