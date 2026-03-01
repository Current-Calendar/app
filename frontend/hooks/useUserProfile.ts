import { useState, useEffect } from 'react';
const USE_MOCK = true; //  <<--- ACTÍVALO SOLO PARA DESARROLLO
export const useUserProfile = (userId : string) => {
    const [userBeingViewed, setUserBeingViewed] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]); 
    const [calendars, setCalendars] = useState<any[]>([]);
    const [isFollowing, setIsFollowing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [userNotFound, setUserNotFound] = useState(false);  //por si el usuario no está disponible o no es encontrado
    

    useEffect(() => {
    async function fetchData() {
        setIsLoading(true);

        if (USE_MOCK) {
            console.log("Usando datos MOCK…");

            await new Promise(r => setTimeout(r, 700)); // Simula delay de API

            setUserBeingViewed({
                id: userId,
                username: "john_doe",
                pronombres: "he/him",
                biografia: "I'm a mock user for testing 😄",
                foto: "https://i.pravatar.cc/300",
                is_following: false,
            });

            setEvents([
                {
                    id: 1,
                    titulo: "Mock Event 1",
                    descripcion: "Evento de prueba",
                    nombre_lugar: "Playa del Carmen",
                    fecha: "2025-03-10",
                    hora: "18:30:00",
                    foto: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
                },
                {
                    id: 2,
                    titulo: "Mock Event 2",
                    descripcion: "Otro evento",
                    nombre_lugar: "Puerto de Santa María",
                    fecha: "2025-04-01",
                    hora: "12:00:00",
                    foto: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429"
                }
            ]);

            setCalendars([
                {
                    id: 1,
                    nombre: "Calendar A",
                    descripcion: "Calendario de prueba",
                    estado: "PUBLICO",
                    portada: "https://images.unsplash.com/photo-1508780709619-79562169bc64"
                },
                {
                    id: 2,
                    nombre: "Calendar B",
                    descripcion: "Test calendar",
                    estado: "AMIGOS",
                    portada: "https://images.unsplash.com/photo-1469474968028-56623f02e42e"
                }
            ]);

            setIsFollowing(false);
            setIsLoading(false);
            return;
        }

        // -------- API REAL --------
        try {
            const [userRes, eventsRes, calendarsRes] = await Promise.all([
                fetch(`http://10.0.2.2:3000/api/users/${userId}/`),
                fetch(`http://10.0.2.2:3000/api/users/${userId}/events/`),
                fetch(`http://10.0.2.2:3000/api/users/${userId}/calendars/`)
            ]);

            if (userRes.ok) {
                const data = await userRes.json();
                setUserBeingViewed(data);
                setIsFollowing(data.is_following || false);
            } else {
                setUserNotFound(true);
            }

            if (eventsRes.ok) setEvents(await eventsRes.json());
            else setEvents([]);

            if (calendarsRes.ok) setCalendars(await calendarsRes.json());
            else setCalendars([]);

        } catch (error) {
            console.error(error);
            setUserNotFound(true);
        }

        setIsLoading(false);
    }

    fetchData();
}, [userId]);

    const handleFollowToggle = async () => {
        setIsFollowing(prev => !prev); 
        try {
            const response = await fetch(`http://10.0.2.2:3000/api/users/${userId}/follow/`, {
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
        events,
        calendars,
        isFollowing,
        isLoading,
        userNotFound,
        handleFollowToggle
    };
};