import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "@/types/calendar";
import apiClient from "@/services/api-client";

type UserItem = {
  id: number;
  username: string;
  email: string;
  bio?: string;
  photo?: string | null;
  followed?: boolean;
  isOwner?: boolean;
};

interface AddCoOwnerModalProps {
  calendar: Calendar | null;
  onClose: () => void;
}

const TEXT = "#10464D";
const MUTED = "#7A7468";
const BORDER = "#E7E2D8";
const BG = "#F8F6F1";
const WHITE = "#FFFFFF";
const TEAL = "#1F6A6A";

function getInitial(name: string) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function UserAvatar({ user, size = 42 }: { user: UserItem; size?: number }) {
  if (user.photo) {
    return (
      <Image
        source={{ uri: user.photo }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avatarFallbackText}>{getInitial(user.username)}</Text>
    </View>
  );
}

export function AddCoOwnerModal({ calendar, onClose }: AddCoOwnerModalProps) {
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState<UserItem | null>(null);
  const [following, setFollowing] = useState<UserItem[]>([]);
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const isVisible = !!calendar;

  useEffect(() => {
    if (!calendar) return;

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setLoadingOwner(true);
        setLoadingFollowing(true);

        const me = await apiClient.get<any>("/users/me/");

        if (!isMounted) return;

        setOwner({
          id: me.id,
          username: me.username,
          email: me.email,
          bio: me.bio,
          photo: me.photo ?? null,
          isOwner: true,
        });

        const followingResponse = await apiClient.get<any[]>(
          `/users/${me.id}/following/`
        );

        if (!isMounted) return;

        const normalizedFollowing = (followingResponse ?? [])
          .slice(0, 20)
          .map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            bio: user.bio,
            photo: user.photo ?? null,
            followed: true,
          }));

        setFollowing(normalizedFollowing);
      } catch (error) {
        console.error("Error loading co-owner modal data:", error);
      } finally {
        if (isMounted) {
          setLoadingOwner(false);
          setLoadingFollowing(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [calendar]);

  useEffect(() => {
    if (!calendar) return;

    let isMounted = true;

    const runSearch = async () => {
      const term = search.trim();

      if (!term) {
        setSearchResults([]);
        return;
      }

      try {
        setLoadingSearch(true);

        const response = await apiClient.get<any[]>(
          `/users/search/?search=${encodeURIComponent(term)}`
        );

        if (!isMounted) return;

        const ownerId = owner?.id;

        const normalizedResults = (response ?? [])
          .map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            bio: user.bio,
            photo: user.photo ?? null,
            followed: user.followed ?? false,
          }))
          .filter((user) => user.id !== ownerId);

        setSearchResults(normalizedResults);
      } catch (error) {
        console.error("Error searching users:", error);
        if (isMounted) setSearchResults([]);
      } finally {
        if (isMounted) setLoadingSearch(false);
      }
    };

    const timeout = setTimeout(runSearch, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [search, calendar, owner?.id]);

  const usersToShow = useMemo(() => {
    if (search.trim()) return searchResults;
    return following;
  }, [search, searchResults, following]);

  const loading = loadingOwner || (!search.trim() ? loadingFollowing : loadingSearch);

  if (!calendar) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Add co-owner to "{calendar.name}"</Text>
            </View>

            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close-circle" size={26} color="#bbb" />
            </Pressable>
          </View>

          <View style={styles.fixedTop}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Co-owners</Text>

              <View style={styles.coOwnersCard}>
                {owner ? (
                  <View style={styles.userRow}>
                    <View style={styles.userLeft}>
                      <UserAvatar user={owner} />
                      <View style={styles.userTextBlock}>
                        <Text style={styles.userName}>@{owner.username} (Owner)</Text>
                        <Text style={styles.userEmail}>{owner.email}</Text>
                      </View>
                    </View>

                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>Owner</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.loadingInline}>
                    <ActivityIndicator size="small" color={TEAL} />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search users</Text>

              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={MUTED} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by username or email"
                  placeholderTextColor="#9D978D"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.helperText}>
                {!search.trim() ? "People you follow" : "Search results"}
              </Text>
            </View>
          </View>

          <View style={styles.listArea}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={TEAL} />
              </View>
            ) : (
              <FlatList
                data={usersToShow}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <Pressable style={styles.searchResultRow}>
                    <View style={styles.userLeft}>
                      <UserAvatar user={item} />
                      <View style={styles.userTextBlock}>
                        <Text style={styles.userName}>@{item.username}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                      </View>
                    </View>

                    <View style={styles.addButton}>
                      <Ionicons name="add" size={16} color={TEAL} />
                      <Text style={styles.addButtonText}>Add</Text>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No users found</Text>
                  </View>
                }
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 900,
    height: "75%",
    backgroundColor: WHITE,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: TEXT,
  },
  fixedTop: {
    flexShrink: 0,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 10,
  },
  coOwnersCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    backgroundColor: WHITE,
    overflow: "hidden",
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  userLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  userTextBlock: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT,
  },
  userEmail: {
    marginTop: 2,
    fontSize: 13,
    color: MUTED,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF6F5",
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEAL,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 14 : 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingInline: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 8,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEF6F5",
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEAL,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: MUTED,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F29F05",
  },
  avatarFallbackText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});