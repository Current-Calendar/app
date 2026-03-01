import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    Image,
    Pressable,
} from "react-native";
import { useState, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";

// domain types for calendars/events
import { Calendar, CalendarEvent } from '@/types/calendar';
import { MOCK_CALENDARS, MOCK_EVENTS } from '@/constants/mock-data';

interface User {
    id: string;
    name: string;
    bio: string;
    followed: boolean;
}

const mockUsers: User[] = [
    { id: "1", name: "User1", bio: "Lorem ipsum dolor sit amet", followed: false },
    { id: "2", name: "User2", bio: "Lorem ipsum dolor sit amet", followed: false },
    { id: "3", name: "User3", bio: "Lorem ipsum dolor sit amet", followed: false },
    { id: "4", name: "User4", bio: "Lorem ipsum dolor sit amet", followed: false },
    { id: "5", name: "User5", bio: "Lorem ipsum dolor sit amet", followed: false },
    { id: "6", name: "User6", bio: "Lorem ipsum dolor sit amet", followed: false },
    { id: "7", name: "User7", bio: "Lorem ipsum dolor sit amet", followed: false },
    { id: "8", name: "User8", bio: "Lorem ipsum dolor sit amet", followed: false },
    { id: "9", name: "User9", bio: "Lorem ipsum dolor sit amet", followed: false },
];

export default function SearchScreen() {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState(mockUsers);

    const calendarMap = useMemo(() => {
        const m: Record<string, string> = {};
        MOCK_CALENDARS.forEach((c) => (m[c.id] = c.nombre));
        return m;
    }, []);

    type SearchResult =
        | { type: 'user'; data: User }
        | { type: 'calendar'; data: Calendar }
        | { type: 'event'; data: CalendarEvent };

    const filtered: SearchResult[] = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();

        const usersRes: SearchResult[] = users
            .filter((u) => u.name.toLowerCase().includes(q))
            .map((u) => ({ type: 'user', data: u }));

        const calRes: SearchResult[] = MOCK_CALENDARS
            .filter((c) => c.nombre.toLowerCase().includes(q))
            .map((c) => ({ type: 'calendar', data: c }));

        const eventRes: SearchResult[] = MOCK_EVENTS
            .filter((e) => e.titulo.toLowerCase().includes(q))
            .map((e) => ({ type: 'event', data: e }));

        return [...usersRes, ...calRes, ...eventRes];
    }, [query, users]);

    const toggleFollow = (id: string) => {
        setUsers((prev) =>
            prev.map((user) =>
                user.id === id ? { ...user, followed: !user.followed } : user
            )
        );
    };

    return (
        <View style={styles.container}>

            {/* SEARCH BAR */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#888" />
                <TextInput
                    placeholder='Search users, calendars, events...'
                    value={query}
                    onChangeText={setQuery}
                    style={styles.input}
                />
            </View>

            {/* RESULTS */}
            <FlatList<SearchResult>
                data={filtered}
                keyExtractor={(item: any) => `${item.type}-${item.data.id}`}
                renderItem={({ item }) => {
                    if (item.type === 'user') {
                        const user = item.data as User;
                        return (
                            <View style={styles.userCard}>
                                <View style={styles.userInfo}>
                                    <Image
                                        source={{ uri: 'https://i.pravatar.cc/100' }}
                                        style={styles.avatar}
                                    />
                                    <View>
                                        <Text style={styles.name}>{user.name}</Text>
                                        <Text style={styles.bio}>{user.bio}</Text>
                                    </View>
                                </View>

                                <Pressable
                                    style={[
                                        styles.followButton,
                                        user.followed && styles.followingButton,
                                    ]}
                                    onPress={() => toggleFollow(user.id)}
                                >
                                    <Text style={styles.followText}>
                                        {user.followed ? 'Following' : 'Follow'}
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    }

                    if (item.type === 'calendar') {
                        const cal = item.data as Calendar;
                        return (
                            <View style={styles.calendarCard}>
                                {cal.portada && (
                                    <Image
                                        source={{ uri: cal.portada }}
                                        style={styles.calendarCover}
                                    />
                                )}
                                <View style={styles.calendarInfo}>
                                    <Text style={styles.calendarName}>{cal.nombre}</Text>
                                    <Text style={styles.calendarDesc}>{cal.descripcion}</Text>
                                </View>
                            </View>
                        );
                    }

                    const ev = item.data as CalendarEvent;
                    return (
                        <View style={styles.eventCard}>
                            <View style={styles.eventInfo}>
                                <Text style={styles.eventTitle}>{ev.titulo}</Text>
                                <Text style={styles.eventMeta}>
                                    {ev.fecha} {ev.hora}
                                    {ev.calendarId &&
                                        ` • ${calendarMap[ev.calendarId] || ''}`}
                                </Text>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#E8E5D8",
    },

    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 20,
        gap: 8,
    },

    input: {
        flex: 1,
    },

    userCard: {
        backgroundColor: "#F2F2F2",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    userInfo: {
        flexDirection: "row",
        alignItems: "center",
    },

    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },

    name: {
        fontWeight: "bold",
    },

    bio: {
        fontSize: 12,
        color: "#666",
    },

    followButton: {
        backgroundColor: "#eb8c85",
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },

    followingButton: {
        backgroundColor: "#fffded",
    },

    followText: {
        color: "#fff",
        fontWeight: "600",
    },

    calendarCard: {
        backgroundColor: "#F2F2F2",
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
    },
    calendarCover: {
        width: "100%",
        height: 120,
    },
    calendarInfo: {
        padding: 12,
    },
    calendarName: {
        fontWeight: "bold",
        fontSize: 16,
    },
    calendarDesc: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },

    eventCard: {
        backgroundColor: "#F2F2F2",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    eventInfo: {
        flexDirection: "column",
    },
    eventTitle: {
        fontWeight: "bold",
        fontSize: 15,
    },
    eventMeta: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
});