import { useState, useEffect } from 'react';

import { useAuth } from "@/hooks/use-auth";
import apiClient, { ApiError } from '@/services/api-client';

const USE_MOCK = false; // <<--- ENABLE ONLY FOR DEVELOPMENT

export type CalendarItem = {
    id: number;
    name: string;
    description: string;
    privacy: string;
    cover: string;
    created_at?: string;
};

const hasHttpStatus = (error: unknown, statusCode: number) => {
    if (error instanceof ApiError) {
        return error.status === statusCode;
    }
    if (error instanceof Error) {
        return error.message.includes(`HTTP ${statusCode}`);
    }
    return false;
};

const toPublicCalendarItems = (items: any[], creatorId?: number): CalendarItem[] => {
    if (!Array.isArray(items)) return [];

    return items
        .filter((item) => !item?.privacy || item?.privacy === 'PUBLIC')
        .filter((item) => (creatorId ? Number(item?.creator_id) === creatorId : true))
        .map((item) => ({
            id: Number(item.id),
            name: item.name ?? '',
            description: item.description ?? '',
            privacy: item.privacy ?? 'PUBLIC',
            cover: item.cover ?? '',
            created_at: item.created_at,
        }));
};

export const useUserProfile = (userId?: string) => {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const [userBeingViewed, setUserBeingViewed] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [userNotFound, setUserNotFound] = useState(false);
    const [followError, setFollowError] = useState<string | null>(null);

    // ----- MOCK follow toggle -----
    const mockFollowToggle = () => {
        return new Promise<{ followed: boolean }>((resolve) => {
            setIsFollowing(prev => {
                const next = !prev;
                resolve({ followed: next });
                return next;
            });
        });
    };

    useEffect(() => {
        if (!userId) {
            setUserBeingViewed(null);
            setIsFollowing(false);
            setUserNotFound(false);
            setIsLoading(false);
            return;
        }

        if (authLoading) {
            return;
        }

        let profileTargetId = userId;
        try {
            profileTargetId = decodeURIComponent(userId);
        } catch {
            profileTargetId = userId;
        }
        profileTargetId = profileTargetId.trim();
        const normalizedUsername = profileTargetId.toLowerCase();

        async function fetchData() {
            setIsLoading(true);
            setUserNotFound(false);
            setFollowError(null);

            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 700));
                const mockUser = {
                    id: 1,
                    username: userId,
                    pronouns: "he/him",
                    bio: "I'm a mock user for testing 😄",
                    photo: undefined,
                    is_following: false,
                    total_followers: 123,
                    total_following: 456,
                    public_calendars: [
                        {
                            id: 1,
                            name: "Calendar A",
                            description: "Test calendar",
                            privacy: "PUBLIC",
                            cover: "https://images.unsplash.com/photo-1508780709619-79562169bc64"
                        }
                    ]
                };
                setUserBeingViewed(mockUser);
                setIsFollowing(mockUser.is_following);
                setIsLoading(false);
                return;
            }

            try {
                let resolvedUserId = profileTargetId;
                let searchExactMatch: any | null = null;

                if (!/^\d+$/.test(profileTargetId)) {
                    const candidates = await apiClient.get<any[]>(
                        `/users/search/?search=${encodeURIComponent(profileTargetId)}`
                    );

                    const exactMatch = Array.isArray(candidates)
                        ? candidates.find((candidate) =>
                            String(candidate?.username ?? '').toLowerCase() === normalizedUsername
                        )
                        : undefined;

                    if (!exactMatch?.id) {
                        setUserBeingViewed(null);
                        setUserNotFound(true);
                        setIsLoading(false);
                        return;
                    }

                    searchExactMatch = exactMatch;
                    resolvedUserId = String(exactMatch.id);
                }

                try {
                    const data = await apiClient.get<any>(`/users/${resolvedUserId}/`);
                    setUserBeingViewed({
                        ...data,
                        public_calendars: toPublicCalendarItems(data.public_calendars ?? []),
                    });
                    setIsFollowing(Boolean(data.is_following));
                    setUserNotFound(false);
                } catch (error) {
                    const notAllowed = hasHttpStatus(error, 401) || hasHttpStatus(error, 403);

                    if (!notAllowed) {
                        throw error;
                    }

                    const fallbackUser = searchExactMatch ?? (() => {
                        if (!/^\d+$/.test(profileTargetId)) return null;
                        return {
                            id: Number(profileTargetId),
                            username: '',
                            pronouns: null,
                            bio: null,
                            photo: null,
                            total_followers: 0,
                            total_following: 0,
                        };
                    })();

                    const fallbackCandidates = fallbackUser
                        ? [fallbackUser]
                        : await apiClient.get<any[]>(
                            `/users/search/?search=${encodeURIComponent(profileTargetId)}`
                        );

                    const resolvedFallback = Array.isArray(fallbackCandidates)
                        ? fallbackCandidates.find((candidate) => {
                            if (/^\d+$/.test(profileTargetId)) {
                                return Number(candidate?.id) === Number(profileTargetId);
                            }
                            return String(candidate?.username ?? '').toLowerCase() === normalizedUsername;
                        })
                        : null;

                    if (!resolvedFallback?.id) {
                        setUserBeingViewed(null);
                        setUserNotFound(true);
                        setIsFollowing(false);
                        setIsLoading(false);
                        return;
                    }

                    const publicCalendarsRaw = await apiClient.get<any[]>(
                        `/calendars/list/?privacy=PUBLIC`
                    );

                    setUserBeingViewed({
                        ...resolvedFallback,
                        is_following: false,
                        public_calendars: toPublicCalendarItems(publicCalendarsRaw, Number(resolvedFallback.id)),
                    });
                    setIsFollowing(false);
                    setUserNotFound(false);
                    setFollowError('Log in to see full information and follow this user.');
                }
            } catch (error) {
                console.error(error);
                setUserBeingViewed(null);
                setUserNotFound(true);
                setIsFollowing(false);
            }

            setIsLoading(false);
        }

        fetchData();
    }, [userId, authLoading]);

    // ----- Follow toggle -----
    const handleFollowToggle = async () => {
        if (!userBeingViewed?.id) return;

        if (!currentUser) {
            setFollowError('Log in to follow this user.');
            return;
        }

        const targetId = userBeingViewed?.id ? String(userBeingViewed.id) : userId;

        if (USE_MOCK) {
            await mockFollowToggle();
            return;
        }

        const previousState = isFollowing;
        const delta = previousState ? -1 : 1;
        setFollowError(null);
        setIsFollowing(!previousState);
        setUserBeingViewed((prev) =>
            prev
                ? { ...prev, total_followers: Math.max(0, (prev.total_followers ?? 0) + delta) }
                : prev
        );

        try {
            const data = await apiClient.post<{ followed: boolean; target_total_followers?: number; current_total_following?: number }>(`/users/${targetId}/follow/`, {});

            if (typeof data?.followed !== 'boolean') {
                setFollowError('Could not update follow status. Please try again.');
                setIsFollowing(previousState);
                setUserBeingViewed((prev) =>
                    prev
                        ? { ...prev, total_followers: Math.max(0, (prev.total_followers ?? 0) - delta) }
                        : prev
                );
                return;
            }
            const nextFollowed = Boolean(data.followed);
            const targetTotal = typeof data.target_total_followers === 'number'
                ? data.target_total_followers
                : Math.max(0, (userBeingViewed.total_followers ?? 0) + (nextFollowed ? 1 : -1));

            setIsFollowing(nextFollowed);
            setUserBeingViewed((prev) =>
                prev ? { ...prev, total_followers: targetTotal } : prev
            );
        } catch (error) {
            console.error('Error follow:', error);
            setFollowError('There was a network problem. Check your connection and try again.');
            setIsFollowing(previousState);
            setUserBeingViewed((prev) =>
                prev
                    ? { ...prev, total_followers: Math.max(0, (prev.total_followers ?? 0) - delta) }
                    : prev
            );
        }
    };

    return {
        userBeingViewed,
        calendars: (userBeingViewed?.public_calendars || []) as CalendarItem[],
        isFollowing,
        isLoading,
        userNotFound,
        followError,
        handleFollowToggle
    };
};
