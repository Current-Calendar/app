import React, { useState } from 'react';
import { 
    View, 
    Text, 
    Image, 
    ScrollView, 
    TouchableOpacity, 
    SafeAreaView, 
    ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native'; 

// Importaciones de archivos locales
import { styles } from './UserProfileStyles';
import { useUserProfile } from './useUserProfile'; 
import EventCard from './EventCard'; 
import CalendarCard from './CalendarCard';

export default function UserProfileScreen() {
    const route = useRoute();
    const userId = route.params?.userId || '1'; 
    const [activeTab, setActiveTab] = useState('events');

    const { 
        userBeingViewed, 
        events, 
        calendars, 
        isFollowing, 
        isLoading, 
        userNotFound,
        handleFollowToggle 
    } = useUserProfile(userId);
        
    // 1. Estado de Carga
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#164E52" />
            </SafeAreaView>
        );
    }

    // 2. Manejo de Errores (Usuario no encontrado o error de red)
    if (userNotFound || !userBeingViewed) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person-remove-outline" size={60} color="#ccc" />
                <Text style={styles.errorText}>Este perfil no está disponible.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header superior decorativo */}
            <View style={styles.topHeader}>
                <Ionicons name="water" size={30} color="white" />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                {/* --- SECCIÓN PERFIL --- */}
                <View style={styles.profileContainer}>
                    <View style={styles.profileMainRow}>
                        <View>
                            <Image 
                                source={{ uri: userBeingViewed.foto || 'https://via.placeholder.com/80' }} 
                                style={styles.avatar} 
                            />
                            <View style={styles.badge}>
                                <Ionicons name="star" size={12} color="white" />
                            </View>
                        </View>
                        
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{userBeingViewed.username}</Text>
                            <Text style={styles.pronouns}>{userBeingViewed.pronombres || 'they/them'}</Text>
                            <Text style={styles.bio}>{userBeingViewed.biografia || 'Sin biografía disponible.'}</Text>
                        </View>
                    </View>

                    <View style={styles.followButtonContainer}>
                        <TouchableOpacity 
                            style={[styles.followButton, isFollowing && styles.followButtonActive]}
                            onPress={handleFollowToggle}
                        >
                            <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.followersText}>
                        Followed by ...{/*TODO*/}
                    </Text>
                </View>

                {/* --- SECCIÓN ÚNICA: PUBLICATIONS --- */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Publications</Text>
                    
                    {/* Mini selector de tipo de publicación */}
                    <View style={styles.miniTabRow}>
                        <TouchableOpacity onPress={() => setActiveTab('events')}>
                            <Text style={[styles.miniTabText, activeTab === 'events' && styles.miniTabActive]}>
                                Events
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.miniTabSeparator}>|</Text>
                        <TouchableOpacity onPress={() => setActiveTab('calendars')}>
                            <Text style={[styles.miniTabText, activeTab === 'calendars' && styles.miniTabActive]}>
                                Calendars
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Renderizado condicional del feed */}
                <View style={styles.feedContainer}>
                    {activeTab === 'events' ? (
                        events.length > 0 
                            ? events.map(ev => <EventCard key={`ev-${ev.id}`} event={ev} />)
                            : <Text style={styles.emptyText}>No hay eventos publicados.</Text>
                    ) : (
                        calendars.length > 0 
                            ? calendars.map(cal => <CalendarCard key={`cal-${cal.id}`} calendario={cal} />)
                            : <Text style={styles.emptyText}>No hay calendarios publicados.</Text>
                    )}
                </View>

            </ScrollView>
            
            {/* Bottom Navigation persistente */}
            <View style={styles.bottomNav}>
                <Ionicons name="home-outline" size={24} color="white" />
                <Ionicons name="search-outline" size={24} color="white" />
                <Ionicons name="add-circle" size={35} color="white" />
                <Ionicons name="chatbubble-outline" size={24} color="white" />
                <Ionicons name="locate-outline" size={24} color="white" />
            </View>
        </SafeAreaView>
    );
}