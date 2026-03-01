import React from 'react';
import {
    View, 
    Text, 
    Image, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Tu hook y componentes
import { useUserProfile, CalendarItem } from '../../../hooks/use-public-profile';
import CalendarCard from '../../../components/calendar-card';


export default function PublicProfile({ targetUserId }: { targetUserId: string }) {
    
    // Le pasamos el ID que recibimos directamente a tu hook
    const {
        userBeingViewed,
        calendars,
        isFollowing,
        isLoading,
        userNotFound,
        handleFollowToggle,
    } = useUserProfile(targetUserId);

    if (!targetUserId) {
        return (
            <SafeAreaView style={[styles.container, styles.centerContent]}> 
                <Ionicons name="person-circle-outline" size={60} color="#dbdbdb" />
                <Text style={styles.errorText}>Selecciona un usuario.</Text>
            </SafeAreaView>
        );
    }

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#262626" />
            </SafeAreaView>
        );
    }

    if (userNotFound || !userBeingViewed) {
        return (
            <SafeAreaView style={[styles.container, styles.centerContent]}>
                <Ionicons name="person-remove-outline" size={60} color="#dbdbdb" />
                <Text style={styles.errorText}>Este perfil no está disponible.</Text>
            </SafeAreaView>
        );
    }

    // UI CLONADA DE TU AMIGO
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>

                <View style={styles.profileSection}>
                    <View style={styles.profileRow}>
                        <View style={styles.profilePictureContainer}>
                            <Image
                                source={{ uri: userBeingViewed.foto || 'https://via.placeholder.com/150' }}
                                style={styles.profilePicture}
                            />
                        </View>

                        <View style={styles.statsContainer}>
                            <Text style={styles.name}>{userBeingViewed.username}</Text>
                            <Text style={styles.pronouns}>{userBeingViewed.pronombres || 'they/them'}</Text>
                            
                            {/* Stats de seguidores */}
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{userBeingViewed.total_seguidores || 0}</Text>
                                    <Text style={styles.statLabel}>Followers</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{userBeingViewed.total_seguidos || 0}</Text>
                                    <Text style={styles.statLabel}>Following</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.bioSection}>
                        <Text style={styles.bio}>{userBeingViewed.biografia}</Text>
                    </View>

                                    <TouchableOpacity 
                                        style={[styles.followButton, isFollowing && styles.followButtonActive]} 
                                        onPress={handleFollowToggle}
                                    >
                                        <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </Text>
                                    </TouchableOpacity>
                </View>

                {/* Grid de calendarios */}
                <View style={styles.postsGrid}>
                    <Text style={styles.gridHeaderText}>{`${userBeingViewed.username}'s Calendars`}</Text>
                    
                    {calendars.length > 0 ? (
                        calendars.map((cal: CalendarItem) => (
                            <CalendarCard key={cal.id} calendario={cal} />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No public calendars yet.</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ESTILOS 100% IDÉNTICOS AL ARCHIVO DE TU AMIGO
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffded' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  profileSection: { paddingHorizontal: 16, paddingTop: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  profilePictureContainer: { marginRight: 28 },
  profilePicture: { width: 120, height: 120, borderRadius: 200, borderWidth: 2, borderColor: '#dbdbdb' },
  statsContainer: { flex: 1, flexDirection: 'column' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '600', color: '#262626' },
  statLabel: { fontSize: 13, color: '#737373', marginTop: 2 },
  bioSection: { marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', color: '#262626' },
  pronouns: { fontSize: 12, fontWeight: '500', color: '#6868689a', marginBottom: 10, marginTop: 4 },
  bio: { fontSize: 14, color: '#262626', lineHeight: 20 },
    followButton: { backgroundColor: '#eb8c85', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16, maxWidth: 500 },
    followButtonActive: { backgroundColor: '#e0e0e0' },
    followButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
    followButtonTextActive: { color: '#262626' },
  postsGrid: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', alignItems: 'center' },
  gridHeaderText: { padding: 16, fontSize: 16, fontWeight: '600', color: '#262626' },
  emptyText: { marginTop: 20, color: '#737373', fontStyle: 'italic' },
  errorText: { marginTop: 10, color: '#737373', fontSize: 16 }
});