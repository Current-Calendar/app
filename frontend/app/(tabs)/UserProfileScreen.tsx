import React, { useState } from 'react';
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
import { useRoute, RouteProp } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';

// Importaciones de archivos locales
import { styles } from '../UserProfile/UserProfileStyles';
import { useUserProfile } from '../../hooks/useUserProfile';
import EventCard from '../UserProfile/EventCard';
import CalendarCard from '../UserProfile/CalendarCard';

// ---------- Tipos ----------
type RootStackParamList = {
    UserProfile: { userId: string };
};

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen() {
    const route = useRoute<UserProfileRouteProp>();
    const searchParams = useLocalSearchParams<{ userId?: string }>();
    const userId = searchParams.userId ?? route.params?.userId ?? '1';

    const [activeTab, setActiveTab] = useState<'events' | 'calendars'>('events');

    // Tipos del hook (puedes ajustarlos según tus datos reales)
    const {
        userBeingViewed,
        events,
        calendars,
        isFollowing,
        isLoading,
        userNotFound,
        handleFollowToggle,
    } = useUserProfile(userId);

    // ---------------- LOADING ----------------
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#164E52" />
            </SafeAreaView>
        );
    }

    // ---------------- ERROR ----------------
    if (userNotFound || !userBeingViewed) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person-remove-outline" size={60} color="#ccc" />
                <Text style={styles.errorText}>Este perfil no está disponible.</Text>
            </SafeAreaView>
        );
    }

    // ---------------- UI PRINCIPAL ----------------
    return (
        <SafeAreaView style={styles.container}>
            {/* Header superior */}
            <View style={styles.topHeader}>
                <Ionicons name="water" size={30} color="white" />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                {/* --- PERFIL --- */}
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
                        Followed by ...
                    </Text>
                </View>

                {/* --- PUBLICATIONS --- */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Publications</Text>
                    
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

                {/* Render dinámico */}
                <View style={styles.feedContainer}>
                    {activeTab === 'events' ? (
                        events.length > 0 ? (
                            events.map(ev => <EventCard key={`ev-${ev.id}`} event={ev} />)
                        ) : (
                            <Text style={styles.emptyText}>No hay eventos publicados.</Text>
                        )
                    ) : (
                        calendars.length > 0 ? (
                            calendars.map(cal => <CalendarCard key={`cal-${cal.id}`} calendario={cal} />)
                        ) : (
                            <Text style={styles.emptyText}>No hay calendarios publicados.</Text>
                        )
                    )}
                </View>
            </ScrollView>
            
        </SafeAreaView>
    );
}