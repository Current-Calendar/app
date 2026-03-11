import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    Image,
    Pressable,
    TouchableOpacity,
    GestureResponderEvent,
} from "react-native";
import { useState, useMemo, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import API_CONFIG from '@/constants/api';

// domain types for calendars/events
import { Calendar, CalendarEvent } from '@/types/calendar';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const USE_MOCK = false; // <<--- ACTÍVALO SOLO PARA DESARROLLO

export default function SearchScreen() {
    const [query, setQuery] = useState("");
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [calendars, setCalendars] = useState<Calendar[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!query.trim()) {
                setUsers([]);
                return;
            }

            try {
                const response = await fetch(API_CONFIG.endpoints.searchUsers(query));
                const data = await response.json();
                setUsers(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error buscando users:", error);
            }
        };

        const timeoutId = setTimeout(fetchUsers, 400);
        return () => clearTimeout(timeoutId);
    }, [query]);

    useEffect(() => {
        const fetchCalendar = async () => {
            if (!query.trim()) {
                setCalendars([]);
                return;
            }

            try {
                const response = await fetch(API_CONFIG.endpoints.searchCalendars(query));
                const data = await response.json();
                setCalendars(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error buscando calendars:", error);
            }
        };

        const timeoutId = setTimeout(fetchCalendar, 400);
        return () => clearTimeout(timeoutId);
    }, [query]);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!query.trim()) {
                setEvents([]);
                return;
            }

            try {
                const response = await fetch(API_CONFIG.endpoints.searchEvents(query));
                const data = await response.json();
                setEvents(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error buscando events:", error);
            }
        };

        const timeoutId = setTimeout(fetchEvents, 400);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const calendarMap = useMemo(() => {
        const m: Record<string, string> = {};
        calendars.forEach((c) => {
            m[c.id.toString()] = c.name;
        });
        return m;
    }, [calendars]);

    type SearchResult =
        | { type: 'user'; data: any }
        | { type: 'calendar'; data: Calendar }
        | { type: 'event'; data: CalendarEvent };

    const filtered: SearchResult[] = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();

        const usersRes: SearchResult[] = users.map((u) => ({ type: 'user', data: u }));

        const calRes: SearchResult[] = calendars.map((c) => ({ type: 'calendar', data: c }));

        const eventRes: SearchResult[] = events.map((e) => ({ type: 'event', data: e }));

        return [...usersRes, ...calRes, ...eventRes];
    }, [query, users, calendars, events]);

    const followUser = async (id: string) => {
        setLoadingId(id);

        if (USE_MOCK) {
            setUsers(prev =>
                prev.map(u => u.id === id ? { ...u, followed: !u.followed } : u)
            );
            setLoadingId(null);
            return;
        }

        try {
            const response = await fetch(`${API_URL}users/${id}/follow/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) throw new Error("Follow failed");

            const data = await response.json();

            setUsers(prev =>
                prev.map(u =>
                    u.id === id ? { ...u, followed: data.followed } : u
                )
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    const handleUserSelect = (id: string) => {
        router.push(`/profile/${id}`);
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
                        const user = item.data;
                        return (
                            <TouchableOpacity style={styles.userCard} onPress={() => handleUserSelect(user.id)}>
                                <View style={styles.userInfo}>
                                    <Image
                                        source={{ uri: user.photo || 'https://i.pravatar.cc/100' }}
                                        style={styles.avatar}
                                    />
                                    <View>
                                        <Text style={styles.name}>{user.username}</Text>
                                        <Text style={styles.bio}>{user.bio}</Text>
                                    </View>
                                </View>

                                <Pressable
                                    style={[
                                        styles.followButton,
                                        user.followed && styles.followingButton,
                                    ]}
                                    onPress={(event) => {
                                        event.stopPropagation();
                                        followUser(user.id);
                                    }}
                                >
                                    <Text style={styles.followText}>
                                        {loadingId === user.id ? "..." : user.followed ? "Following" : "Follow"}
                                    </Text>
                                </Pressable>
                            </TouchableOpacity>
                        );
                    }

                    if (item.type === 'calendar') {
                        const cal = item.data as Calendar;
                        return (
                            <View style={styles.calendarCard}>
                                {cal.cover && (
                                    <Image source={{ uri: cal.cover }} style={styles.calendarCover} />
                                )}
                                <View style={styles.calendarInfo}>
                                    <Text style={styles.calendarName}>{cal.name}</Text>
                                    <Text style={styles.calendarDesc}>{cal.description}</Text>
                                </View>
                            </View>
                        );
                    }

                    const ev = item.data as CalendarEvent;
                    return (
                        <View style={styles.eventCard}>
                            <View style={styles.eventRow}>
                                {ev.photo && (
                                    <Image
                                        source={{ uri: ev.photo }}
                                        style={styles.eventImage}
                                    />
                                )}
                                <View style={styles.eventInfo}>
                                    <Text style={styles.eventTitle}>{ev.title}</Text>
                                    <Text style={styles.eventMeta}>
                                        {ev.date} {ev.time}
                                        {ev.calendarId &&
                                            ` • ${calendarMap[ev.calendarId] || ''}`}
                                    </Text>
                                </View>
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
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
});