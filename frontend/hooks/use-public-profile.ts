import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { useAuth } from "@/hooks/use-auth";
import { User } from '../types/user';
import apiClient from '@/services/api-client';

const USE_MOCK = false; // <<--- ENABLE ONLY FOR DEVELOPMENT

const deriveDebuggerHost = () => {
    const hostUri =
        Constants.expoConfig?.hostUri ??
        Constants.expoGoConfig?.hostUri ??
        Constants.manifest2?.extra?.expoGo?.debuggerHost ??
        Constants.manifest?.debuggerHost;

    if (!hostUri) {
        return null;
    }

    return hostUri.split(':')[0];
};

const buildDevBaseUrl = () => {
    const debuggerHost = deriveDebuggerHost();

    if (debuggerHost) {
        return `http://${debuggerHost}:8000/api/v1/`;
    }

    return Platform.OS === 'android'
        ? 'http://10.0.2.2:8000/api/v1/'
        : 'http://localhost:8000/api/v1/';
};

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const API_BASE = ensureTrailingSlash(
    process.env.EXPO_PUBLIC_API_URL ?? buildDevBaseUrl()
);

export type CalendarItem = {
    id: number;
    name: string;
    description: string;
    privacy: string;
    cover: string;
    created_at?: string;
};

export const useUserProfile = (username?: string) => {
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
        if (!username) {
            setUserBeingViewed(null);
            setIsFollowing(false);
            setUserNotFound(false);
            setIsLoading(false);
            return;
        }

        // Wait for auth to finish loading before making API calls
        if (authLoading) {
            return;
        }

        async function fetchData() {
            setIsLoading(true);

            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 700));
                const mockUser = {
                    id: 1,
                    username: username,
                    pronouns: "he/him",
                    bio: "I'm a mock user for testing 😄",
                    photo: "https://i.pravatar.cc/300",
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
                const headers: Record<string, string> = { Accept: 'application/json' };
                const authToken = apiClient.getAccessToken();
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }

                const response = await fetch(`${API_BASE}users/by-username/${username}/`, {
                    headers,
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    setUserBeingViewed(data);
                    setIsFollowing(Boolean(data.is_following));
                } else {
                    setUserNotFound(true);
                }
            } catch (error) {
                console.error(error);
                setUserNotFound(true);
            }

            setIsLoading(false);
        }

        fetchData();
    }, [username, authLoading]);

    // ----- Follow toggle (usa el ID numérico del usuario visto) -----
    const handleFollowToggle = async () => {
        if (!userBeingViewed?.id) return;

        if (USE_MOCK) {
            await mockFollowToggle();
            return;
        }

        const previousState = isFollowing;
        setFollowError(null);
        setIsFollowing(!previousState);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            };
            const authToken = apiClient.getAccessToken();
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${API_BASE}users/${userBeingViewed.id}/follow/`, {
                method: 'POST',
                headers,
                credentials: 'include',
            });

            if (!response.ok) {
                let message = 'Could not update follow status. Please try again.';
                if (response.status === 401 || response.status === 403) {
                    message = 'You need to log in to follow this user.';
                }
                setFollowError(message);
                setIsFollowing(previousState);
                return;
            }

            const data = await response.json();
            setIsFollowing(Boolean(data.followed));
        } catch (error) {
            console.error('Error follow:', error);
            setFollowError('There was a network problem. Check your connection and try again.');
            setIsFollowing(previousState);
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