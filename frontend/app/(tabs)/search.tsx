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
import { Calendar, CalendarEvent } from '@/types/calendar';
import { AdCard } from '@/components/ads/ad-card';
import { injectAds, isAdItem } from '@/components/ads/inject-ads';
import { useAdsConfig } from '@/hooks/use-ads-config';
import { useSearchHistory} from '@/hooks/use-search-history';

const USE_MOCK = false;

type TabType = 'all' | 'calendars' | 'events' | 'users';

type TabOption = {
    type: TabType;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
};

const TAB_OPTIONS: TabOption[] = [
    { type: 'all', label: 'All', icon: 'grid-outline' },
    { type: 'calendars', label: 'Calendars', icon: 'calendar-outline' },
    { type: 'events', label: 'Events', icon: 'flag-outline' },
    { type: 'users', label: 'Users', icon: 'people-outline' },
];

function normalizeText(value: unknown): string {
    return String(value ?? "").trim();
}

function getMatchIndex(text: string, term: string): number {
    if (!text || !term) return -1;
    return text.toLowerCase().indexOf(term.toLowerCase());
}

function buildDescriptionSnippet(description: string, term: string, maxLength = 100): string {
    const raw = normalizeText(description);
    const query = normalizeText(term);
    if (!raw) return "";
    if (!query) return raw.length > maxLength ? `${raw.slice(0, maxLength).trim()}...` : raw;

    const matchIndex = getMatchIndex(raw, query);
    if (matchIndex < 0) {
        return raw.length > maxLength ? `${raw.slice(0, maxLength).trim()}...` : raw;
    }

    const contextSize = Math.max(20, Math.floor((maxLength - query.length) / 2));
    const start = Math.max(0, matchIndex - contextSize);
    const end = Math.min(raw.length, matchIndex + query.length + contextSize);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < raw.length ? "..." : "";

    return `${prefix}${raw.slice(start, end).trim()}${suffix}`;
}

function renderHighlightedText(text: string, query: string, baseStyle: any, highlightStyle: any) {
    const source = normalizeText(text);
    const term = normalizeText(query);

    if (!source) return <Text style={baseStyle} />;
    if (!term) return <Text style={baseStyle}>{source}</Text>;

    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    const parts = source.split(regex);

    return (
        <Text style={baseStyle}>
            {parts.map((part, index) => {
                const isMatch = part.toLowerCase() === term.toLowerCase();
                return (
                    <Text key={`${part}-${index}`} style={isMatch ? highlightStyle : undefined}>
                        {part}
                    </Text>
                );
            })}
        </Text>
    );
}

export default function SearchScreen() {
    const [query, setQuery] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

    const { results: userResults } = useUserSearch(query);
    const { results: calendars } = useCalendarSearch(query);
    const { results: events } = useEventSearch(query);
    const { followUser: followUserRequest } = useFollowUserAction();
    const { data: adsConfig } = useAdsConfig();
    const { addEntry, history } = useSearchHistory();

    useEffect(() => {
        setUsers(userResults);
    }, [userResults]);

    useEffect(() => {
        if (!query.trim()) setActiveTab('all');
    }, [query]);

    const calendarMap = useMemo(() => {
        const m: Record<string, string> = {};
        calendars.forEach((c) => { m[c.id.toString()] = c.name; });
        return m;
    }, [calendars]);

    type SearchResult =
        | { type: 'user'; data: any }
        | { type: 'calendar'; data: any }
        | { type: 'event'; data: any };

    const allResults: SearchResult[] = useMemo(() => {
        if (!query.trim()) return history;
        const usersRes: SearchResult[] = users.map((u) => ({ type: 'user', data: u }));
        const calRes: SearchResult[] = calendars.map((c) => ({ type: 'calendar', data: c }));
        const eventRes: SearchResult[] = events.map((e) => ({ type: 'event', data: e }));
        return [...usersRes, ...calRes, ...eventRes];
    }, [query, users, calendars, events, history]);

    const filtered: SearchResult[] = useMemo(() => {
        if (activeTab === 'all') return allResults;
        return allResults.filter(item => {
            if (activeTab === 'calendars') return item.type === 'calendar';
            if (activeTab === 'events') return item.type === 'event';
            if (activeTab === 'users') return item.type === 'user';
            return true;
        });
    }, [activeTab, allResults]);

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

    const handleUserSelect = (username: string, photo: string ) => {
        addEntry({ type: 'user', data: { username, photo }, timestamp: Date.now() })
        router.push(`/profile/${username}`);
    };

    const handleCalendarSelect = (calendarId: string | number, name: string, cover: string) => {
        addEntry({ type: 'calendar', data: { calendarId, name, cover }, timestamp: Date.now() })
        router.push(`/calendar-view?calendarId=${calendarId}`);
    };

    const handleEventSelect = (event: CalendarEvent) => {
        const title = event.title ; 
        const photo = event.photo; 
        const id = event.id; 
        addEntry({ type: 'event', data: { id, title , photo }, timestamp: Date.now() })
        setActiveEvent(event);
        if (event.calendarId) {
            router.push(`/calendar-view?calendarId=${event.calendarId}`);
            return;
        }
        router.push(`/switch-events`);
    };

    const showTabs = query.trim().length > 0 || history.length > 0;
    
    const getEmptyMessage = () => {
        if (activeTab === 'all') return 'No results found';
        if (activeTab === 'calendars') return 'No calendars found';
        if (activeTab === 'events') return 'No events found';
        if (activeTab === 'users') return 'No users found';
        return 'No results found';
    };

    const listData = adsConfig?.show_ads && filtered.length > 0
        ? injectAds(filtered, adsConfig.frequency)
        : filtered;

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#888" />
                <TextInput
                    placeholder='Search users, calendars, events...'
                    value={query}
                    onChangeText={setQuery}
                    style={styles.input}
                    testID="search-input"
                />
            </View>

            {showTabs && (
                <View style={styles.tabStrip}>
                    {TAB_OPTIONS.map((tab) => {
                        const isActive = activeTab === tab.type;
                        return (
                            <TouchableOpacity
                                key={tab.type}
                                onPress={() => setActiveTab(tab.type)}
                                style={[
                                    styles.tabChip,
                                    isActive ? styles.tabChipActive : styles.tabChipInactive,
                                ]}
                                activeOpacity={0.7}
                                testID={`search-tab-${tab.type}`}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={16}
                                    color={isActive ? '#fff' : '#10464d'}
                                />
                                <Text style={[styles.tabLabel, { color: isActive ? '#fff' : '#333' }]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            <FlatList
                style={styles.list}
                contentContainerStyle={styles.listContent}
                data={listData}
                keyExtractor={(item: any) => {
                    if (isAdItem(item)) return item.id;
                    const id = item.data.id ?? item.data.calendarId ?? item.data.username;
                    return `${item.type}-${id}`;
                }}
                ListEmptyComponent={
                    showTabs ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
                        </View>
                    ) : null
                }
                renderItem={({ item }: any) => {
                    if (isAdItem(item)) return <AdCard placement="search" />;

                    if (item.type === 'user') {
                        const user = item.data;
                        return (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => handleUserSelect(user.username , user.photo)}
                                testID={`search-user-card-${user.username}`}
                            >
                                <Image
                                    source={
                                        user.photo && user.photo.trim() !== ""
                                            ? { uri: user.photo }
                                            : require('../../assets/images/default-user.jpg')
                                    }
                                    style={[styles.leftImage, styles.roundedFull]}
                                />
                                <View style={styles.middleInfo}>
                                    <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{user.username}</Text>
                                    <Text style={styles.subText} numberOfLines={2} ellipsizeMode="tail">{user.bio}</Text>
                                </View>
                                <Pressable
                                    style={[styles.followButton, user.followed && styles.followingButton]}
                                    onPress={(event) => {
                                        event.stopPropagation();
                                        followUser(user.id);
                                    }}
                                    testID={`search-follow-button-${user.username}`}
                                >
                                    <Text style={[styles.followText, user.followed && styles.followingText]}>
                                        {loadingId === String(user.id) ? "..." : user.followed ? "Following" : "Follow"}
                                    </Text>
                                </Pressable>
                            </TouchableOpacity>
                        );
                    }

                    if (item.type === 'calendar') {
                        const cal = item.data;
                        const description = normalizeText(cal.description);
                        const titleMatches = getMatchIndex(normalizeText(cal.name), query) >= 0;
                        const descriptionMatches = getMatchIndex(description, query) >= 0;
                        const descriptionSnippet = buildDescriptionSnippet(description, query);
                        const calendarColor = cal.color || "#10464d";

                        return (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => handleCalendarSelect(cal.id, cal.name, cal.cover )}
                                testID={`search-calendar-card-${cal.id}`}
                            >
                                {cal.cover ? (
                                    <Image source={{ uri: cal.cover }} style={styles.leftImage} />
                                ) : (
                                    <View style={[styles.leftImage, styles.placeholderIcon, { backgroundColor: `${calendarColor}20` }]}>
                                        <Ionicons name="calendar" size={24} color={calendarColor} />
                                    </View>
                                )}
                                <View style={styles.middleInfo}>
                                    <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{cal.name}</Text>
                                    {!!descriptionSnippet && (
                                        <View>
                                            {renderHighlightedText(descriptionSnippet, query, styles.subText, styles.highlightText)}
                                            {descriptionMatches && !titleMatches && (
                                                <Text style={styles.matchTag}>Matches description</Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                                {cal.creator_username && (
                                    <View style={styles.rightMeta}>
                                        <Ionicons name="person-circle-outline" size={16} color="#666" />
                                        <Text style={styles.rightMetaText} numberOfLines={1} ellipsizeMode="tail">
                                            {cal.creator_username}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }

                    const ev = item.data;
                    const eventDescription = normalizeText(ev.description);
                    const eventTitleMatches = getMatchIndex(normalizeText(ev.title), query) >= 0;
                    const eventDescriptionMatches = getMatchIndex(eventDescription, query) >= 0;
                    const eventDescriptionSnippet = buildDescriptionSnippet(eventDescription, query);

                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleEventSelect(ev)}
                            testID={`search-event-card-${ev.id}`}
                        >
                            {ev.photo ? (
                                <Image source={{ uri: ev.photo }} style={styles.leftImage} />
                            ) : (
                                <View style={[styles.leftImage, styles.placeholderIcon, { backgroundColor: '#f0f0f0' }]}>
                                    <Ionicons name="flag" size={24} color="#a0a0a0" />
                                </View>
                            )}
                            <View style={styles.middleInfo}>
                                <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{ev.title}</Text>
                                <Text style={styles.subText} numberOfLines={1} ellipsizeMode="tail">
                                    {ev.date} {ev.time}
                                </Text>
                                {!!eventDescriptionSnippet && (
                                    <View>
                                        {renderHighlightedText(eventDescriptionSnippet, query, styles.subText, styles.highlightText)}
                                        {eventDescriptionMatches && !eventTitleMatches && (
                                            <Text style={styles.matchTag}>Matches description</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                            {ev.creator_username && (
                                <View style={styles.rightMeta}>
                                    <Ionicons name="person-circle-outline" size={16} color="#666" />
                                    <Text style={styles.rightMetaText} numberOfLines={1} ellipsizeMode="tail">
                                        {ev.creator_username}
                                    </Text>
                                </View>
                            )}
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
    tabStrip: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    tabChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    tabChipActive: {
        backgroundColor: '#10464d',
        shadowColor: '#10464d',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    tabChipInactive: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(16,70,77,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    list: {
        flex: 1,
    },
    listContent: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        paddingBottom: 20,
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: '#888',
        fontStyle: 'italic',
    },
    card: {
        borderColor: "#10464d",
        backgroundColor: "white",
        borderWidth: 2,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    leftImage: {
        width: 70,
        height: 70,
        borderRadius: 8,
    },
    roundedFull: {
        borderRadius: 25,
    },
    placeholderIcon: {
        justifyContent: "center",
        alignItems: "center",
    },
    middleInfo: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
    },
    title: {
        fontWeight: "bold",
        fontSize: 15,
        color: "#1a1a1a",
    },
    subText: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    rightMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        maxWidth: 90,
        marginRight: 4,
    },
    rightMetaText: {
        fontSize: 12,
        color: "#10464d",
        fontWeight: "600",
        flexShrink: 1,
    },
    followButton: {
        backgroundColor: "#eb8c85",
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginLeft: 'auto',
    },
    followingButton: {
        backgroundColor: "#10464d",
    },
    followText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 13,
    },
    followingText: {
        color: "#fff",
    },
    highlightText: {
        color: "#10464d",
        fontWeight: "700",
    },
    matchTag: {
        marginTop: 4,
        fontSize: 11,
        color: "#10464d",
        fontWeight: "700",
    },
});