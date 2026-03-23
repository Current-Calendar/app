import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    Image,
    Pressable,
    TouchableOpacity,
} from "react-native";
import { useState, useMemo, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUserSearch, useCalendarSearch, useEventSearch, useFollowUserAction } from '@/hooks/use-search';
import { PublicEventDetailModal } from '@/components/public-event-detail-modal';

// domain types for calendars/events
import { Calendar, CalendarEvent } from '@/types/calendar';

const USE_MOCK = false; // <<--- ACTÍVALO SOLO PARA DESARROLLO

export default function SearchScreen() {
    const [query, setQuery] = useState("");
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

    const { results: userResults } = useUserSearch(query);
    const { results: calendars } = useCalendarSearch(query);
    const { results: events } = useEventSearch(query);

    const { followUser: followUserRequest } = useFollowUserAction();

    useEffect(() => {
        setUsers(userResults);
    }, [userResults]);

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

        const usersRes: SearchResult[] = users.map((u) => ({ type: 'user', data: u }));

        const calRes: SearchResult[] = calendars.map((c) => ({ type: 'calendar', data: c }));

        const eventRes: SearchResult[] = events.map((e) => ({ type: 'event', data: e }));

        return [...usersRes, ...calRes, ...eventRes];
    }, [query, users, calendars, events]);

    const followUser = async (id: string | number) => {
        const normalizedId = String(id);
        setLoadingId(normalizedId);

        if (USE_MOCK) {
            setUsers(prev =>
                prev.map(u => String(u.id) === normalizedId ? { ...u, followed: !u.followed } : u)
            );
            setLoadingId(null);
            return;
        }

        try {
            const data = await followUserRequest(normalizedId);

            setUsers(prev =>
                prev.map(u =>
                    String(u.id) === normalizedId ? { ...u, followed: data.followed } : u
                )
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingId(null);
        }
    };

    const handleUserSelect = (username: string) => {
        router.push(`/profile/${username}`);
    };

    const handleCalendarSelect = (calendarId: string | number) => {
        router.push(`/calendar-view?calendarId=${calendarId}`);
    };

    const handleEventSelect = (event: CalendarEvent) => {
        setActiveEvent(event);
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
                            <TouchableOpacity style={styles.userCard} onPress={() => handleUserSelect(user.username)}>
                                <View style={styles.userInfo}>
                                    <Image
                                        source={{ uri: user.photo || 'https://i.pravatar.cc/100' }}
                                        style={styles.avatar}
                                    />
                                    <View style={styles.userTextContainer}>
                                        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{user.username}</Text>
                                        <Text style={styles.bio} numberOfLines={2} ellipsizeMode="tail">
                                            {user.bio}
                                        </Text>
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
                                        {loadingId === String(user.id) ? "..." : user.followed ? "Following" : "Follow"}
                                    </Text>
                                </Pressable>
                            </TouchableOpacity>
                        );
                    }

                    if (item.type === 'calendar') {
                        const cal = item.data as Calendar;
                        return (
                            <TouchableOpacity style={styles.calendarCard} onPress={() => handleCalendarSelect(cal.id)}>
                                {cal.cover && (
                                    <Image source={{ uri: cal.cover }} style={styles.calendarCover} />
                                )}
                                <View style={styles.calendarInfo}>
                                    <Text style={styles.calendarName} numberOfLines={1} ellipsizeMode="tail">{cal.name}</Text>
                                    <Text style={styles.calendarDesc} numberOfLines={2} ellipsizeMode="tail">{cal.description}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }

                    const ev = item.data as CalendarEvent;
                    return (
                        <TouchableOpacity style={styles.eventCard} onPress={() => handleEventSelect(ev)}>
                            <View style={styles.eventRow}>
                                {ev.photo && (
                                    <Image
                                        source={{ uri: ev.photo }}
                                        style={styles.eventImage}
                                    />
                                )}
                                <View style={styles.eventInfo}>
                                    <Text style={styles.eventTitle} numberOfLines={1} ellipsizeMode="tail">{ev.title}</Text>
                                    <Text style={styles.eventMeta} numberOfLines={1} ellipsizeMode="tail">
                                        {ev.date} {ev.time}
                                        {ev.calendarId &&
                                            ` • ${calendarMap[ev.calendarId] || ''}`}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            <PublicEventDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
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
        flex: 1,
    },

    userTextContainer: {
        flex: 1,
        flexShrink: 1,
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
        flex: 1,
        flexShrink: 1,
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
