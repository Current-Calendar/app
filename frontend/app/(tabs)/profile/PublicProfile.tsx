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

// Tu hook y componentes
import { useUserProfile, CalendarItem } from '../../../hooks/use-public-profile';
import CalendarCard from '../../../components/calendar-card';
import profileStyles from './profileStyles';


export default function PublicProfile({ targetUserId }: { targetUserId: string }) {
    
    // Le pasamos el ID que recibimos directamente a tu hook
    const {
        userBeingViewed,
        calendars,
        isFollowing,
        isLoading,
        userNotFound,
        followError,
        handleFollowToggle,
    } = useUserProfile(targetUserId);

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

    // UI CLONADA DE TU AMIGO
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
                            
                            {/* Stats de seguidores */}
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

                {/* Grid de calendarios */}
                <View style={profileStyles.postsGrid}>
                    <Text style={profileStyles.gridHeaderText}>{`${userBeingViewed.username}'s Calendars`}</Text>
                    
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