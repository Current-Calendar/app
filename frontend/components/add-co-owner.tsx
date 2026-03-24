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
import apiClient, { ApiError } from "@/services/api-client";

type UserItem = {
  id: number;
  username: string;
  email: string;
  bio?: string;
  photo?: string | null;
  followed?: boolean;
  isOwner?: boolean;
};

type CoOwnerPayloadItem = {
  id: number;
  username: string;
  email?: string;
  bio?: string;
  photo?: string | null;
};

interface AddCoOwnerModalProps {
  calendar: Calendar | null;
  onClose: () => void;
  onCalendarUpdated?: (updatedCalendar: any) => void;
}

const TEXT = "#10464D";
const MUTED = "#7A7468";
const BORDER = "#E7E2D8";
const BG = "#F8F6F1";
const WHITE = "#FFFFFF";
const TEAL = "#1F6A6A";
const LIGHT_TEAL = "#EEF6F5";
const DANGER = "#B33F37";
const DANGER_BG = "#FCEAEA";

function getInitial(name: string) {
  return String(name ?? "").trim().charAt(0).toUpperCase() || "?";
}

function normalizeUser(user: any): UserItem {
  return {
    id: Number(user?.id),
    username: String(user?.username ?? ""),
    email: String(user?.email ?? ""),
    bio: String(user?.bio ?? ""),
    photo: user?.photo ?? null,
    followed: Boolean(user?.followed ?? false),
  };
}

function normalizeCoOwner(user: any): UserItem {
  return {
    id: Number(user?.id),
    username: String(user?.username ?? ""),
    email: String(user?.email ?? ""),
    bio: String(user?.bio ?? ""),
    photo: user?.photo ?? null,
  };
}

function getCalendarCreatorUsername(calendar: any): string {
  if (typeof calendar?.creator_username === "string" && calendar.creator_username.trim()) {
    return calendar.creator_username.trim();
  }
  if (typeof calendar?.creator === "string" && calendar.creator.trim()) {
    return calendar.creator.trim();
  }
  return "";
}

function getCalendarCreatorId(calendar: any): number | null {
  const raw = calendar?.creator_id;
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
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

export function AddCoOwnerModal({
  calendar,
  onClose,
  onCalendarUpdated,
}: AddCoOwnerModalProps) {
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState<UserItem | null>(null);
  const [coOwners, setCoOwners] = useState<UserItem[]>([]);
  const [following, setFollowing] = useState<UserItem[]>([]);
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);

  const [loadingOwner, setLoadingOwner] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  const [isCalendarOwner, setIsCalendarOwner] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isVisible = !!calendar;

  useEffect(() => {
    if (!calendar) return;

    let isMounted = true;

    const loadInitialData = async () => {
      setErrorMessage("");
      setSearch("");
      setSearchResults([]);
      setSavingIds([]);
      setRemovingIds([]);
      setLoadingOwner(true);
      setLoadingFollowing(true);

      try {
        const me = await apiClient.get<any>("/users/me/");
        if (!isMounted) return;

        const creatorId = getCalendarCreatorId(calendar);
        const creatorUsername = getCalendarCreatorUsername(calendar);

        const amIOwner =
          creatorId !== null
            ? Number(creatorId) === Number(me.id)
            : creatorUsername === String(me.username ?? "");

        setIsCalendarOwner(amIOwner);

        const ownerUser: UserItem = {
          id: creatorId ?? Number(me.id),
          username: creatorUsername || String(me.username ?? ""),
          email:
            creatorId !== null && Number(creatorId) === Number(me.id)
              ? String(me.email ?? "")
              : "",
          bio:
            creatorId !== null && Number(creatorId) === Number(me.id)
              ? String(me.bio ?? "")
              : "",
          photo:
            creatorId !== null && Number(creatorId) === Number(me.id)
              ? me.photo ?? null
              : null,
          isOwner: true,
        };

        setOwner(ownerUser);

        const backendCoOwners: UserItem[] = Array.isArray((calendar as any)?.co_owners)
          ? (calendar as any).co_owners.map(normalizeCoOwner)
          : [];

        setCoOwners(backendCoOwners);

        try {
          const followingResponse = await apiClient.get<any[]>(
            `/users/${me.id}/following/`
          );

          if (!isMounted) return;

          const normalizedFollowing = (followingResponse ?? [])
            .map(normalizeUser)
            .filter((user) => user.id !== Number(me.id));

          setFollowing(normalizedFollowing);
        } catch (followingError) {
          console.error("Error loading following users:", followingError);
          if (isMounted) {
            setFollowing([]);
            setErrorMessage("Could not load users.");
          }
        }
      } catch (error) {
        console.error("Error loading co-owner modal data:", error);
        if (!isMounted) return;

        setOwner(null);
        setIsCalendarOwner(false);
        setCoOwners(
          Array.isArray((calendar as any)?.co_owners)
            ? (calendar as any).co_owners.map(normalizeCoOwner)
            : []
        );
        setFollowing([]);
        setErrorMessage("Could not load users.");
      } finally {
        if (isMounted) {
          setLoadingOwner(false);
          setLoadingFollowing(false);
        }
      }
    };

    void loadInitialData();

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
        setErrorMessage("");

        const response = await apiClient.get<any[]>(
          `/users/search/?search=${encodeURIComponent(term)}`
        );

        if (!isMounted) return;

        const ownerId = owner?.id;

        const normalizedResults = (response ?? [])
          .map(normalizeUser)
          .filter((user) => user.id !== ownerId);

        setSearchResults(normalizedResults);
      } catch (error) {
        console.error("Error searching users:", error);
        if (isMounted) {
          setSearchResults([]);
          setErrorMessage("Could not search users.");
        }
      } finally {
        if (isMounted) setLoadingSearch(false);
      }
    };

    const timeout = setTimeout(() => {
      void runSearch();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [search, calendar, owner?.id]);

  const coOwnerIds = useMemo(() => coOwners.map((user) => user.id), [coOwners]);

  const usersToShow = useMemo(() => {
    const source = search.trim() ? searchResults : following;
    return source.filter((user) => user.id !== owner?.id);
  }, [search, searchResults, following, owner?.id]);

  const topUsers = useMemo(() => {
    const list: Array<UserItem & { __role: "owner" | "co-owner" }> = [];

    if (owner) {
      list.push({ ...owner, __role: "owner" });
    }

    coOwners.forEach((user) => {
      list.push({ ...user, __role: "co-owner" });
    });

    return list;
  }, [owner, coOwners]);

  const loading =
    loadingOwner || (!search.trim() ? loadingFollowing : loadingSearch);

  const buildUpdatedCalendarPayload = (response: any) => {
    return {
      ...(calendar ?? {}),
      ...(response ?? {}),
      creator:
        response?.creator ??
        (calendar as any)?.creator ??
        getCalendarCreatorUsername(calendar),
      creator_id:
        response?.creator_id ??
        (calendar as any)?.creator_id ??
        getCalendarCreatorId(calendar),
      creator_username:
        response?.creator_username ??
        (calendar as any)?.creator_username ??
        getCalendarCreatorUsername(calendar),
      co_owners:
        response?.co_owners ??
        (calendar as any)?.co_owners ??
        [],
    };
  };

  const mapResponseCoOwnersToUsers = (
    payloadCoOwners: CoOwnerPayloadItem[] | undefined
  ): UserItem[] => {
    return (payloadCoOwners ?? []).map((item) => {
      const foundUser =
        following.find((candidate) => candidate.id === item.id) ||
        searchResults.find((candidate) => candidate.id === item.id) ||
        coOwners.find((candidate) => candidate.id === item.id);

      return {
        id: item.id,
        username: item.username,
        email: item.email ?? foundUser?.email ?? "",
        bio: item.bio ?? foundUser?.bio ?? "",
        photo: item.photo ?? foundUser?.photo ?? null,
      };
    });
  };

  const handleAddCoOwner = async (user: UserItem) => {
    if (!calendar) return;
    if (coOwnerIds.includes(user.id)) return;
    if (savingIds.includes(user.id)) return;

    const nextIds = [...coOwnerIds, user.id];

    setSavingIds((prev) => [...prev, user.id]);
    setErrorMessage("");

    try {
      const response = await apiClient.patch<{
        id: number;
        name: string;
        description?: string;
        cover?: string | null;
        privacy?: string;
        origin?: string;
        creator?: string;
        creator_username?: string;
        creator_id?: number;
        co_owners: CoOwnerPayloadItem[];
      }>(`/calendars/${calendar.id}/co_owners/`, {
        co_owners: nextIds,
      });

      const updatedCoOwners = mapResponseCoOwnersToUsers(response.co_owners);
      setCoOwners(updatedCoOwners);
      onCalendarUpdated?.(buildUpdatedCalendarPayload(response));
    } catch (error) {
      console.error("Error adding co-owner:", error);

      if (error instanceof ApiError) {
        const data: any = error.data;
        const firstError =
          data?.errors?.[0] ||
          data?.error ||
          "Could not add co-owner.";
        setErrorMessage(firstError);
      } else {
        setErrorMessage("Could not add co-owner.");
      }
    } finally {
      setSavingIds((prev) => prev.filter((id) => id !== user.id));
    }
  };

  const handleRemoveCoOwner = async (user: UserItem) => {
    if (!calendar) return;
    if (!isCalendarOwner) return;
    if (removingIds.includes(user.id)) return;

    const nextIds = coOwnerIds.filter((id) => id !== user.id);

    setRemovingIds((prev) => [...prev, user.id]);
    setErrorMessage("");

    try {
      const response = await apiClient.patch<{
        id: number;
        name: string;
        description?: string;
        cover?: string | null;
        privacy?: string;
        origin?: string;
        creator?: string;
        creator_username?: string;
        creator_id?: number;
        co_owners: CoOwnerPayloadItem[];
      }>(`/calendars/${calendar.id}/co_owners/`, {
        co_owners: nextIds,
      });

      const updatedCoOwners = mapResponseCoOwnersToUsers(response.co_owners);
      setCoOwners(updatedCoOwners);
      onCalendarUpdated?.(buildUpdatedCalendarPayload(response));
    } catch (error) {
      console.error("Error removing co-owner:", error);

      if (error instanceof ApiError) {
        const data: any = error.data;
        const firstError =
          data?.errors?.[0] ||
          data?.error ||
          "Could not remove co-owner.";
        setErrorMessage(firstError);
      } else {
        setErrorMessage("Could not remove co-owner.");
      }
    } finally {
      setRemovingIds((prev) => prev.filter((id) => id !== user.id));
    }
  };

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
                <FlatList
                  data={topUsers}
                  keyExtractor={(item) => `${item.__role}-${item.id}`}
                  style={styles.coOwnersScroll}
                  contentContainerStyle={styles.coOwnersScrollContent}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item, index }) => {
                    const isOwnerRow = item.__role === "owner";
                    const isRemoving = removingIds.includes(item.id);

                    return (
                      <View
                        style={[
                          styles.userRow,
                          index > 0 && styles.userRowBorder,
                        ]}
                      >
                        <View style={styles.userLeft}>
                          <UserAvatar user={item} />
                          <View style={styles.userTextBlock}>
                            <Text style={styles.userName}>
                              @{item.username}
                              {isOwnerRow ? " (Owner)" : ""}
                            </Text>
                            {!!item.email && (
                              <Text style={styles.userEmail}>{item.email}</Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.rowRight}>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>
                              {isOwnerRow ? "Owner" : "Co-owner"}
                            </Text>
                          </View>

                          {!isOwnerRow && isCalendarOwner && (
                            <Pressable
                              style={[
                                styles.removeButton,
                                isRemoving && styles.removeButtonDisabled,
                              ]}
                              onPress={() => void handleRemoveCoOwner(item)}
                              disabled={isRemoving}
                            >
                              {isRemoving ? (
                                <ActivityIndicator size="small" color={DANGER} />
                              ) : (
                                <>
                                  <Ionicons
                                    name="trash-outline"
                                    size={14}
                                    color={DANGER}
                                  />
                                  <Text style={styles.removeButtonText}>
                                    Remove
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.loadingInline}>
                      <ActivityIndicator size="small" color={TEAL} />
                    </View>
                  }
                />
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

              {!!errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}
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
                nestedScrollEnabled
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const isAlreadyCoOwner = coOwnerIds.includes(item.id);
                  const isSaving = savingIds.includes(item.id);

                  return (
                    <Pressable style={styles.searchResultRow}>
                      <View style={styles.userLeft}>
                        <UserAvatar user={item} />
                        <View style={styles.userTextBlock}>
                          <Text style={styles.userName}>@{item.username}</Text>
                          <Text style={styles.userEmail}>
                            {item.email || item.bio || ""}
                          </Text>
                        </View>
                      </View>

                      {isAlreadyCoOwner ? (
                        <View style={styles.addedButton}>
                          <Ionicons name="checkmark" size={16} color={TEAL} />
                          <Text style={styles.addedButtonText}>Added</Text>
                        </View>
                      ) : (
                        <Pressable
                          style={[
                            styles.addButton,
                            isSaving && styles.addButtonDisabled,
                          ]}
                          onPress={() => void handleAddCoOwner(item)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <ActivityIndicator size="small" color={TEAL} />
                          ) : (
                            <>
                              <Ionicons name="add" size={16} color={TEAL} />
                              <Text style={styles.addButtonText}>Add</Text>
                            </>
                          )}
                        </Pressable>
                      )}
                    </Pressable>
                  );
                }}
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
    height: "88%",
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
  coOwnersScroll: {
    height: 150,
  },
  coOwnersScrollContent: {
    flexGrow: 1,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  userRowBorder: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
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
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
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
    backgroundColor: LIGHT_TEAL,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEAL,
  },
  removeButton: {
    minWidth: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: DANGER_BG,
  },
  removeButtonDisabled: {
    opacity: 0.7,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: DANGER,
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
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: DANGER,
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
    minWidth: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: LIGHT_TEAL,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEAL,
  },
  addedButton: {
    minWidth: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E8F5EC",
  },
  addedButtonText: {
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