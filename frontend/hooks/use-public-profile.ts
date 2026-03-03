import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const USE_MOCK = false; // <<--- ACTÍVALO SOLO PARA DESARROLLO

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
    nombre: string;
    descripcion: string;
    estado: string;
    portada: string;
    fecha_creacion?: string;
};

export const useUserProfile = (userId?: string) => {
    const [userBeingViewed, setUserBeingViewed] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [userNotFound, setUserNotFound] = useState(false);
    const [followError, setFollowError] = useState<string | null>(null);

    const token = "AQUI_VA_EL_TOKEN_DE_TU_SESION";

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

        async function fetchData() {
            setIsLoading(true);

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
                const response = await fetch(`${API_BASE}users/${userId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
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
    }, [userId]);

    // ----- Follow toggle -----
    const handleFollowToggle = async () => {
        if (!userId) return;

        if (USE_MOCK) {
            await mockFollowToggle();
            return;
        }

        const previousState = isFollowing;
        setFollowError(null);
        setIsFollowing(!previousState);

        try {
            const response = await fetch(`${API_BASE}users/${userId}/follow/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                let message = 'No se pudo actualizar el seguimiento. Inténtalo de nuevo.';
                if (response.status === 401 || response.status === 403) {
                    message = 'Necesitas iniciar sesión para seguir a este usuario.';
                }
                setFollowError(message);
                setIsFollowing(previousState);
                return;
            }

            const data = await response.json();
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