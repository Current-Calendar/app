import React from 'react';
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
import { useFollowedCalendars } from '../../../hooks/use-followed-calendars';
import CalendarCard from '../../../components/calendar-card';
import profileStyles from './profileStyles';
import { useAuth } from "@/hooks/use-auth";

export default function PublicProfile({ targetUserId }: { targetUserId: string }) {
    const { user: currentUser } = useAuth();
    
    //Hook personalizado para manejar toda la lógica de perfil público (datos del user, seguimiento, calendars públicos, etc.)
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
    const {
        calendars: followingCalendars,
        loading: followingLoading,
    } = useFollowedCalendars(userBeingViewed?.username, {
        enabled: !!userBeingViewed && !!currentUser,
    });

    // --- MANEJO DE ERRORES Y CARGA ---
    if (!targetUserId) {
        return (
            <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}> 
                <Ionicons name="person-circle-outline" size={60} color="#dbdbdb" />
                <Text style={profileStyles.errorText}>Selecciona un user.</Text>
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
                                source={{ uri: userBeingViewed.photo || 'https://via.placeholder.com/150' }}
                                style={profileStyles.profilePicture}
                            />
                        </View>

                        <View style={profileStyles.statsContainer}>
                            <Text style={profileStyles.name}>{userBeingViewed.username}</Text>
                            <Text style={profileStyles.pronouns}>{userBeingViewed.pronouns || 'they/them'}</Text>

                            <View style={profileStyles.statsRow}>
                                <View style={profileStyles.statItem}>
                                    <Text style={profileStyles.statNumber}>{userBeingViewed.total_followers || 0}</Text>
                                    <Text style={profileStyles.statLabel}>Followers</Text>
                                </View>
                                <View style={profileStyles.statItem}>
                                    <Text style={profileStyles.statNumber}>{userBeingViewed.total_following || 0}</Text>
                                    <Text style={profileStyles.statLabel}>Following</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={profileStyles.bioSection}>
                        <Text style={profileStyles.bio}>{userBeingViewed.bio}</Text>
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

                {/* Calendars que sigo de este user */}
                {followingLoading ? (
                    <ActivityIndicator size="small" color="#262626" />
                ) : !currentUser ? (
                    <View style={profileStyles.postsGrid}>
                        <Text style={profileStyles.gridHeaderText}>Calendars I Follow</Text>
                        <Text style={profileStyles.emptyText}>Inicia sesión para ver qué calendarios de este perfil sigues.</Text>
                    </View>
                ) : followingCalendars.length > 0 && (
                    <View style={profileStyles.postsGrid}>
                        <Text style={profileStyles.gridHeaderText}>Calendars I Follow</Text>
                        {followingCalendars.map((cal) => (
                            <CalendarCard
                                key={cal.id}
                                calendar={cal}
                                // onPress={() => console.log('Abrir calendar', cal.id)}
                            />
                        ))}
                    </View>
                )}

                {/*Renderizado de calendars públicos */}
                <View style={profileStyles.postsGrid}>
                    <Text style={profileStyles.gridHeaderText}>{`${userBeingViewed.username}'s Public Calendars`}</Text>
                    
                    {calendars.length > 0 ? (
                        calendars.map((cal: CalendarItem) => (
                            <CalendarCard key={cal.id} calendar={cal} />
                        ))
                    ) : (
                        <Text style={profileStyles.emptyText}>No public calendars yet.</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}