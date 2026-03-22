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

import { useUserProfile, CalendarItem } from '../../../hooks/use-public-profile';
import { useFollowedCalendars } from '../../../hooks/use-followed-calendars';
import CalendarCard, { CalendarData } from '../../../components/calendar-card';
import profileStyles from './profileStyles';
import { useAuth } from "@/hooks/use-auth";
import { ReportModal } from "@/components/report-modal";

const toCalendarData = (item: CalendarItem): CalendarData => ({
    id: String(item.id),
    name: item.name,
    description: item.description,
    cover: item.cover,
});

export default function PublicProfile({ targetUsername }: { targetUsername: string }) {
    const { user: currentUser } = useAuth();

    const {
        userBeingViewed,
        calendars,
        isFollowing,
        isLoading,
        userNotFound,
        followError,
        handleFollowToggle,
    } = useUserProfile(targetUsername);

    const {
        calendars: followingCalendars,
        loading: followingLoading,
    } = useFollowedCalendars(userBeingViewed?.username, {
        enabled: !!userBeingViewed && !!currentUser,
    });

    const [reportOpen, setReportOpen] = useState(false);

    if (!targetUsername) {
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
                            {userBeingViewed.pronouns ? (
                                <Text style={profileStyles.pronouns}>{userBeingViewed.pronouns}</Text>
                            ) : null}

                            <View style={profileStyles.statsRow}>
                                <View style={profileStyles.statItem}>
                                    <Text style={profileStyles.statNumber}>{userBeingViewed.public_calendars?.length ?? 0}</Text>
                                    <Text style={profileStyles.statLabel}>Calendars</Text>
                                </View>
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

                    <TouchableOpacity
                        style={[profileStyles.actionButton, { backgroundColor: '#fff', borderColor: '#e53935', borderWidth: 1, marginTop: 10 }]}
                        onPress={() => setReportOpen(true)}
                    >
                        <Text style={[profileStyles.actionButtonText, { color: '#e53935' }]}>Report User</Text>
                    </TouchableOpacity>

                    {followError ? (
                        <Text style={profileStyles.errorText}>{followError}</Text>
                    ) : null}
                </View>

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
                            <CalendarCard key={cal.id} calendar={toCalendarData(cal)} />
                        ))}
                    </View>
                )}

                <View style={profileStyles.postsGrid}>
                    <Text style={profileStyles.gridHeaderText}>{`${userBeingViewed.username}'s Public Calendars`}</Text>
                    {calendars.length > 0 ? (
                        calendars.map((cal: CalendarItem) => (
                            <CalendarCard key={cal.id} calendar={toCalendarData(cal)} />
                        ))
                    ) : (
                        <Text style={profileStyles.emptyText}>No public calendars yet.</Text>
                    )}
                </View>

            </ScrollView>

            <ReportModal
                open={reportOpen}
                onClose={() => setReportOpen(false)}
                reportedType="USER"
                reportedId={userBeingViewed.id}
                reportedLabel={userBeingViewed.username}
            />
        </SafeAreaView>
    );
}