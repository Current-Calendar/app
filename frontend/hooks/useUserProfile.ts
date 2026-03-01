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
    // 1. Solo guardamos el usuario y si lo seguimos o no
    const [userBeingViewed, setUserBeingViewed] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState<boolean>(false);
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [userNotFound, setUserNotFound] = useState(false);

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
                    // En el mock, también metemos los calendarios dentro del usuario
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
                const response = await fetch(`http://10.0.2.2:3000/api/v1/users/${userId}/`);

                if (response.ok) {
                    const data = await response.json();
                    
                    // 2. data ya trae todo (incluyendo data.public_calendars)
                    setUserBeingViewed(data); 
                    
                    // Separamos isFollowing solo para poder alternarlo (toggle) fácilmente
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
    }, [userId]);

    const handleFollowToggle = async () => {
        if (!userId) return;
        setIsFollowing(prev => !prev); 
        try {
            const response = await fetch(`http://10.0.2.2:3000/api/v1/users/${userId}/follow/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) setIsFollowing(prev => !prev); 
        } catch (error) {
            setIsFollowing(prev => !prev); 
            console.error('Error:', error);
        }
    };

    return {
        userBeingViewed,
        // 3. ESTADO DERIVADO: Extraemos los calendarios del objeto principal
        calendars: (userBeingViewed?.public_calendars || []) as CalendarItem[], 
        isFollowing,
        isLoading,
        userNotFound,
        handleFollowToggle
    };
};