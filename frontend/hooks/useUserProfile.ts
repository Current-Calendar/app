import { useState, useEffect } from 'react';

const USE_MOCK = true; // <<--- ACTÍVALO SOLO PARA DESARROLLO

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

    // 🚨 IMPORTANTE: Reemplaza esto por la forma en la que obtengas tu token real
    // (por ejemplo, desde AsyncStorage, un Contexto o Zustand)
    const token = "AQUI_VA_EL_TOKEN_DE_TU_SESION"; 

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
                console.log("Usando datos MOCK…");
                await new Promise(r => setTimeout(r, 700));

                setUserBeingViewed({
                    id: userId,
                    username: "john_doe",
                    pronombres: "he/him",
                    biografia: "I'm a mock user for testing 😄",
                    foto: "https://i.pravatar.cc/300",
                    public_calendars: [
                        {
                            id: 1,
                            nombre: "Calendar A",
                            descripcion: "Calendario de prueba",
                            estado: "PUBLICO",
                            portada: "https://images.unsplash.com/photo-1508780709619-79562169bc64"
                        }
                    ]
                });

                setIsFollowing(false);
                setIsLoading(false);
                return;
            }

            // -------- API REAL --------
            try {
                // 👇 AÑADIDO: Pasamos el token en el GET para que el backend sepa quién lee el perfil
                const response = await fetch(`http://10.0.2.2:3000/api/v1/users/${userId}/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUserBeingViewed(data); 
                    setIsFollowing(data.is_following || false);
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
    }, [userId]); // (Si sacas el token de un estado reactivo, deberías añadirlo a este array de dependencias)

    const handleFollowToggle = async () => {
        if (!userId) return;
        
        setIsFollowing(prev => !prev); 
        
        try {
            const response = await fetch(`http://10.0.2.2:3000/api/v1/users/${userId}/follow/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 👇 Usamos el mismo token
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                setIsFollowing(data.followed); 
            } else {
                setIsFollowing(prev => !prev); 
            }
        } catch (error) {
            setIsFollowing(prev => !prev); 
            console.error('Error:', error);
        }
    };

    return {
        userBeingViewed,
        calendars: (userBeingViewed?.public_calendars || []) as CalendarItem[], 
        isFollowing,
        isLoading,
        userNotFound,
        handleFollowToggle
    };
};