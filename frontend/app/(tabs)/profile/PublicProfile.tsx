import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useUserProfile, CalendarItem } from '../../../hooks/use-public-profile';
import { useFollowedCalendars } from '../../../hooks/use-followed-calendars';
import CalendarCard, { CalendarData } from '../../../components/calendar-card';
import profileStyles from '../../../styles/profile-styles';
import { useAuth } from '@/hooks/use-auth';
import { ReportModal } from '@/components/report-modal';

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
                <Ionicons name="person-circle-outline" size={60} color="#dddcce" />
                <Text style={profileStyles.errorText}>Select a user.</Text>
            </SafeAreaView>
        );
    }

    if (isLoading) {
        return (
            <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
                <ActivityIndicator size="large" color="#10464d" />
            </SafeAreaView>
        );
    }

    if (userNotFound || !userBeingViewed) {
        return (
            <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
                <Ionicons name="person-remove-outline" size={60} color="#dddcce" />
                <Text style={profileStyles.errorText}>This profile is not available.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={profileStyles.container}>
            <ScrollView style={profileStyles.scrollView}>

                <View style={profileStyles.profileHeaderGreen} />
                <View style={profileStyles.profileHeaderCoral} />

                <View style={profileStyles.profileSection}>

                    <View style={profileStyles.profilePictureContainer}>
                        <Image
                            source={{ uri: userBeingViewed.photo || 'https://via.placeholder.com/150' }}
                            style={profileStyles.profilePicture}
                        />
                    </View>

                    <Text style={profileStyles.name}>{userBeingViewed.username}</Text>

                    {userBeingViewed.pronouns ? (
                        <Text style={profileStyles.pronouns}>{userBeingViewed.pronouns}</Text>
                    ) : null}

                    <View style={profileStyles.bioSection}>
                        <Text style={profileStyles.bio}>{userBeingViewed.bio}</Text>
                    </View>

                    <View style={profileStyles.statsContainer}>
                        <View style={profileStyles.statItem}>
                            <Text style={profileStyles.statNumber}>
                                {userBeingViewed.public_calendars?.length ?? 0}
                            </Text>
                            <Text style={profileStyles.statLabel}>Calendars</Text>
                        </View>
                        <View style={profileStyles.statItem}>
                            <Text style={profileStyles.statNumber}>
                                {userBeingViewed.total_followers || 0}
                            </Text>
                            <Text style={profileStyles.statLabel}>Followers</Text>
                        </View>
                        <View style={[profileStyles.statItem, profileStyles.statItemLast]}>
                            <Text style={profileStyles.statNumber}>
                                {userBeingViewed.total_following || 0}
                            </Text>
                            <Text style={profileStyles.statLabel}>Following</Text>
                        </View>
                    </View>

                    <View style={profileStyles.buttonsRow}>
                        <TouchableOpacity
                            style={[profileStyles.actionButton, isFollowing && profileStyles.actionButtonAlt]}
                            onPress={handleFollowToggle}
                        >
                            <Text style={[
                                profileStyles.actionButtonText,
                                isFollowing && profileStyles.actionButtonTextAlt,
                            ]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[profileStyles.actionButton, profileStyles.logoutButton]}
                            onPress={() => setReportOpen(true)}
                        >
                            <Text style={[profileStyles.actionButtonText, profileStyles.logoutButtonText]}>
                                Report user
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {followError ? (
                        <Text style={profileStyles.errorText}>{followError}</Text>
                    ) : null}
                </View>

                <View style={profileStyles.divider} />

                <View style={profileStyles.calendarsWrapper}>

                    <View style={profileStyles.calendarSection}>
                        <View style={profileStyles.calendarSectionPill}>
                            <View style={profileStyles.gridHeaderContainer}>
                                <Text style={profileStyles.gridHeaderText}>Calendars I follow</Text>
                                {followingCalendars.length > 0 && (
                                    <Text style={profileStyles.gridHeaderCount}>{followingCalendars.length}</Text>
                                )}
                            </View>
                            {!currentUser ? (
                                <Text style={profileStyles.emptyText}>
                                    Log in to see which calendars from this profile you follow.
                                </Text>
                            ) : followingLoading ? (
                                <ActivityIndicator size="small" color="#10464d" style={{ marginVertical: 8 }} />
                            ) : followingCalendars.length > 0 ? (
                                followingCalendars.map((cal) => (
                                    <CalendarCard key={cal.id} calendar={toCalendarData(cal)} />
                                ))
                            ) : (
                                <Text style={profileStyles.emptyText}>
                                    {"You're not following any calendars from this profile."}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={profileStyles.calendarSection}>
                        <View style={profileStyles.calendarSectionPill}>
                            <View style={profileStyles.gridHeaderContainer}>
                                <Text style={profileStyles.gridHeaderText}>
                                    {`${userBeingViewed.username}'s calendars`}
                                </Text>
                                <Text style={profileStyles.gridHeaderCount}>{calendars.length}</Text>
                            </View>
                            {calendars.length > 0 ? (
                                calendars.map((cal: CalendarItem) => (
                                    <CalendarCard key={cal.id} calendar={toCalendarData(cal)} />
                                ))
                            ) : (
                                <Text style={profileStyles.emptyText}>No public calendars yet.</Text>
                            )}
                        </View>
                    </View>

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