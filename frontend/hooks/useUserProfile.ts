import { useState, useEffect } from 'react';

export const useUserProfile = (userId : string) => {
    const [userBeingViewed, setUserBeingViewed] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]); 
    const [calendars, setCalendars] = useState<any[]>([]);
    const [isFollowing, setIsFollowing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [userNotFound, setUserNotFound] = useState(false);  //por si el usuario no está disponible o no es encontrado

    useEffect(() => {
        async function fetchData() {
            try {    
                setIsLoading(true);

                const [userRes, eventsRes, calendarsRes] = await Promise.all([
                    fetch(`http://10.0.2.2:3000/api/users/${userId}/`),
                    fetch(`http://10.0.2.2:3000/api/users/${userId}/events/`),
                    fetch(`http://10.0.2.2:3000/api/users/${userId}/calendars/`)
                ]);
                
                // Si la respuesta del usuario es OK, guardamos los datos
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUserBeingViewed(userData);
                    setIsFollowing(userData.is_following || false);
                } else {
                    // Si fallagit, activamos el error
                    setUserNotFound(true);
                }

                // Los eventos y calendarios siguen con array vacío para que no explote el .map()
                if (eventsRes.ok) setEvents(await eventsRes.json());
                else setEvents([]);

                if (calendarsRes.ok) setCalendars(await calendarsRes.json());
                else setCalendars([]);

            } catch (error) {
                console.error('Error fetching data:', error);
                setUserNotFound(true); // Si no hay internet o el server cae, también mostramos el error
            } finally {
                setIsLoading(false);
            }
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