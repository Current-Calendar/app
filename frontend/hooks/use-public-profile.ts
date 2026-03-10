import { useState, useEffect } from 'react';

import { useAuth } from "@/hooks/use-auth";
import apiClient, { ApiError } from '@/services/api-client';

const USE_MOCK = false; // <<--- ACTÍVALO SOLO PARA DESARROLLO

export type CalendarItem = {
    id: number;
    nombre: string;
    descripcion: string;
    estado: string;
    portada: string;
    fecha_creacion?: string;
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
        .filter((item) => item?.estado === 'PUBLICO')
        .filter((item) => (creatorId ? Number(item?.creador_id) === creatorId : true))
        .map((item) => ({
            id: Number(item.id),
            nombre: item.nombre ?? '',
            descripcion: item.descripcion ?? '',
            estado: item.estado ?? 'PUBLICO',
            portada: item.portada ?? '',
            fecha_creacion: item.fecha_creacion,
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

        // Wait for auth to finish loading before making API calls
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
                    id: userId,
                    username: "john_doe",
                    pronombres: "he/him",
                    biografia: "I'm a mock user for testing 😄",
                    foto: "https://i.pravatar.cc/300",
                    is_following: false,
                    total_seguidores: 123,
                    total_seguidos: 456,
                    public_calendars: [
                        {
                            id: 1,
                            nombre: "Calendar A",
                            descripcion: "Calendario de prueba",
                            estado: "PUBLICO",
                            portada: "https://images.unsplash.com/photo-1508780709619-79562169bc64"
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
                        `/usuarios?search=${encodeURIComponent(profileTargetId)}`
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
                    setUserBeingViewed(data);
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
                            pronombres: null,
                            biografia: null,
                            foto: null,
                            total_seguidores: 0,
                            total_seguidos: 0,
                        };
                    })();

                    const fallbackCandidates = fallbackUser
                        ? [fallbackUser]
                        : await apiClient.get<any[]>(
                            `/usuarios?search=${encodeURIComponent(profileTargetId)}`
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
                        `/calendarios/list?estado=PUBLICO`
                    );

                    setUserBeingViewed({
                        ...resolvedFallback,
                        is_following: false,
                        public_calendars: toPublicCalendarItems(publicCalendarsRaw, Number(resolvedFallback.id)),
                    });
                    setIsFollowing(false);
                    setUserNotFound(false);
                    setFollowError('Inicia sesión para ver información completa y seguir a este usuario.');
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
        if (!userId) return;

        if (!currentUser) {
            setFollowError('Inicia sesión para seguir a este usuario.');
            return;
        }

        const targetId = userBeingViewed?.id ? String(userBeingViewed.id) : userId;

        if (USE_MOCK) {
            await mockFollowToggle();
            return;
        }

        const previousState = isFollowing;
        setFollowError(null);
        setIsFollowing(!previousState);

        try {
            const data = await apiClient.post<{ followed: boolean }>(`/users/${targetId}/follow/`, {});

            if (typeof data?.followed !== 'boolean') {
                let message = 'No se pudo actualizar el seguimiento. Inténtalo de nuevo.';
                setFollowError(message);
                setIsFollowing(previousState);
                return;
            }
            setIsFollowing(Boolean(data.followed));
        } catch (error) {
            console.error('Error follow:', error);
            setFollowError('Hubo un problema de red. Revisa tu conexión e inténtalo de nuevo.');
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