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

    const filtered = useMemo(() => {
        if (!query.trim()) return [];

        return users.filter((user) =>
            user.name.toLowerCase().includes(query.toLowerCase())
        );
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
                    placeholder="Search users..."
                    value={query}
                    onChangeText={setQuery}
                    style={styles.input}
                />
            </View>

            {/* RESULTS */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userCard}>
                        <View style={styles.userInfo}>
                            <Image
                                source={{ uri: "https://i.pravatar.cc/100" }}
                                style={styles.avatar}
                            />
                            <View>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.bio}>{item.bio}</Text>
                            </View>
                        </View>

                        <Pressable
                            style={[
                                styles.followButton,
                                item.followed && styles.followingButton,
                            ]}
                            onPress={() => toggleFollow(item.id)}
                        >
                            <Text style={styles.followText}>
                                {item.followed ? "Following" : "Follow"}
                            </Text>
                        </Pressable>
                    </View>
                )}
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
});