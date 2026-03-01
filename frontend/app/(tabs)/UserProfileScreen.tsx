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
import { useUserProfile, CalendarItem } from '../../hooks/useUserProfile';
import CalendarCard from '../UserProfile/CalendarCard';

// ---------- Tipos ----------
type RootStackParamList = {
    UserProfile: { userId: string };
};

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen() {
    const route = useRoute<UserProfileRouteProp>();
    const searchParams = useLocalSearchParams<{ userId?: string }>();
    const userId = searchParams.userId ?? route.params?.userId;

    // Tipos del hook (puedes ajustarlos según tus datos reales)
    const {
        userBeingViewed,
        calendars,
        isFollowing,
        isLoading,
        userNotFound,
        handleFollowToggle,
    } = useUserProfile(userId);

    if (!userId) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
                <Ionicons name="person-circle-outline" size={60} color="#ccc" />
                <Text style={styles.errorText}>Selecciona un usuario para ver su perfil.</Text>
            </SafeAreaView>
        );
    }

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
    const followerCount = userBeingViewed.total_seguidores ?? 0;
    const followingCount = userBeingViewed.total_seguidos ?? 0;

    return (
        <SafeAreaView style={styles.container}>

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

                    <View style={styles.followStatsRow}>
                        <View style={styles.followStat}>
                            <Text style={styles.followStatValue}>{followerCount}</Text>
                            <Text style={styles.followStatLabel}>Seguidores</Text>
                        </View>
                        <View style={styles.followStat}>
                            <Text style={styles.followStatValue}>{followingCount}</Text>
                            <Text style={styles.followStatLabel}>Seguidos</Text>
                        </View>
                    </View>

                    <Text style={styles.followersText}>
                        Followed by ...
                    </Text>
                </View>

                {/* --- PUBLICATIONS --- */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Calendarios Públicos</Text>
                </View>

                <View style={styles.feedContainer}>
                    {calendars.length > 0 ? (
                        calendars.map((cal: CalendarItem) => <CalendarCard key={`cal-${cal.id}`} calendario={cal} />)
                    ) : (
                        <Text style={styles.emptyText}>No hay calendarios públicos creados.</Text>
                    )}
                </View>
            </ScrollView>
            
        </SafeAreaView>
    );
}