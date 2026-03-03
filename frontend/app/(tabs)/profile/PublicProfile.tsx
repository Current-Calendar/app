import React, { useEffect, useState } from 'react';
import {
    View, 
    Text, 
    Image, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Hooks, contextos y estilos
import { useUserProfile, CalendarItem } from '../../../hooks/use-public-profile';
import CalendarCard from '../../../components/calendar-card';
import profileStyles from './profileStyles';
import { useAuth } from '../../../context/authContext';

export default function PublicProfile({ targetUserId }: { targetUserId: string }) {
    const { user: currentUser } = useAuth();
    
    //Hook personalizado para manejar toda la lógica de perfil público (datos del usuario, seguimiento, calendarios públicos, etc.)
    const {
        userBeingViewed,
        calendars,
        isFollowing,
        isLoading,
        userNotFound,
        followError,
        handleFollowToggle,
    } = useUserProfile(targetUserId);

    //  Estado para los calendarios que sigo de este usuario
    const [followingCalendars, setFollowingCalendars] = useState<CalendarItem[]>([]);
    const [followingLoading, setFollowingLoading] = useState(false);

    useEffect(() => {
        const fetchFollowingCalendars = async () => {
            if (!userBeingViewed || !currentUser) return;

            if (process.env.NODE_ENV === 'development') {
                // Mock para desarrollo
                const mockFollowed = calendars.filter((cal, idx) => idx % 2 === 0);
                setFollowingCalendars(mockFollowed);
                return;
            }

            try {
                setFollowingLoading(true);
                //token!!
                const token = 'AQUI_VA_EL_TOKEN_DE_TU_SESION';
                const response = await fetch(
                    `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'}users/${userBeingViewed.id}/followed_calendars/`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                if (response.ok) {
                    const data: CalendarItem[] = await response.json();
                    setFollowingCalendars(data);
                } else {
                    setFollowingCalendars([]);
                }
            } catch (error) {
                console.error('Error fetching followed calendars:', error);
                setFollowingCalendars([]);
            } finally {
                setFollowingLoading(false);
            }
        };

        fetchFollowingCalendars();
    }, [userBeingViewed, currentUser, calendars]);

    // --- MANEJO DE ERRORES Y CARGA ---
    if (!targetUserId) {
        return (
            <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}> 
                <Ionicons name="person-circle-outline" size={60} color="#dbdbdb" />
                <Text style={profileStyles.errorText}>Selecciona un usuario.</Text>
            </SafeAreaView>
        );
    }

    if (isLoading) {
        return (
            <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
                <ActivityIndicator size="large" color="#262626" />
            </SafeAreaView>
        );
    }

    if (userNotFound || !userBeingViewed) {
        return (
            <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
                <Ionicons name="person-remove-outline" size={60} color="#dbdbdb" />
                <Text style={profileStyles.errorText}>Este perfil no está disponible.</Text>
            </SafeAreaView>
        );
    }

    // --- RENDERIZADO PRINCIPAL ---
    return (
        <SafeAreaView style={profileStyles.container}>
            <ScrollView style={profileStyles.scrollView}>

                <View style={profileStyles.profileSection}>
                    <View style={profileStyles.profileRow}>
                        <View style={profileStyles.profilePictureContainer}>
                            <Image
                                source={{ uri: userBeingViewed.foto || 'https://via.placeholder.com/150' }}
                                style={profileStyles.profilePicture}
                            />
                        </View>

                        <View style={profileStyles.statsContainer}>
                            <Text style={profileStyles.name}>{userBeingViewed.username}</Text>
                            <Text style={profileStyles.pronouns}>{userBeingViewed.pronombres || 'they/them'}</Text>
                            
                            <View style={profileStyles.statsRow}>
                                <View style={profileStyles.statItem}>
                                    <Text style={profileStyles.statNumber}>{userBeingViewed.total_seguidores || 0}</Text>
                                    <Text style={profileStyles.statLabel}>Followers</Text>
                                </View>
                                <View style={profileStyles.statItem}>
                                    <Text style={profileStyles.statNumber}>{userBeingViewed.total_seguidos || 0}</Text>
                                    <Text style={profileStyles.statLabel}>Following</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={profileStyles.bioSection}>
                        <Text style={profileStyles.bio}>{userBeingViewed.biografia}</Text>
                    </View>

                    <TouchableOpacity 
                        style={[profileStyles.actionButton, isFollowing && profileStyles.actionButtonAlt]} 
                        onPress={handleFollowToggle}
                    >
                        <Text style={[profileStyles.actionButtonText, isFollowing && profileStyles.actionButtonTextAlt]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>

                    {followError ? (
                        <Text style={profileStyles.errorText}>{followError}</Text>
                    ) : null}
                </View>

                {/* Calendarios que sigo de este usuario */}
                {followingLoading ? (
                    <ActivityIndicator size="small" color="#262626" />
                ) : followingCalendars.length > 0 && (
                    <View style={profileStyles.postsGrid}>
                        <Text style={profileStyles.gridHeaderText}>Calendars I Follow</Text>
                        {followingCalendars.map((cal) => (
                            <CalendarCard
                                key={cal.id}
                                calendario={cal}
                                // onPress={() => console.log('Abrir calendario', cal.id)}
                            />
                        ))}
                    </View>
                )}

                {/*Renderizado de calendarios públicos */}
                <View style={profileStyles.postsGrid}>
                    <Text style={profileStyles.gridHeaderText}>{`${userBeingViewed.username}'s Public Calendars`}</Text>
                    
                    {calendars.length > 0 ? (
                        calendars.map((cal: CalendarItem) => (
                            <CalendarCard key={cal.id} calendario={cal} />
                        ))
                    ) : (
                        <Text style={profileStyles.emptyText}>No public calendars yet.</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}