import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { User } from '../../../types/auth';
import { useAuth } from '@/hooks/use-auth';
import CalendarCard, { CalendarData } from '../../../components/calendar-card';
import profileStyles from '../../../styles/profile-styles';
import apiClient from '../../../services/api-client';
import { useUserProfile, CalendarItem } from '../../../hooks/use-public-profile';
import { useFollowedCalendars } from '../../../hooks/use-followed-calendars';
import { ReportModal } from '@/components/report-modal';

type OwnProfileCalendarResponse = {
  id: number;
  name: string;
  description?: string | null;
  cover?: string | null;
  privacy: string;
  origin: string;
  creator: string;
  created_at: string;
};

type OwnProfileResponse = {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  pronouns?: string | null;
  bio?: string | null;
  link?: string | null;
  photo?: string | null;
  total_followers: number;
  total_following: number;
  calendars: OwnProfileCalendarResponse[];
  following_calendars: OwnProfileCalendarResponse[];
};

type ProfileMetrics = {
  total_followers: number;
  total_following: number;
  calendars_count: number;
};

const mapUserFromApi = (payload: OwnProfileResponse): User => ({
  id: payload.id,
  username: payload.username,
  email: payload.email,
  bio: payload.bio ?? undefined,
  pronouns: payload.pronouns ?? undefined,
  photo: payload.photo ?? undefined,
});

const mapCalendarsFromApi = (items: OwnProfileCalendarResponse[]): CalendarData[] =>
  items.map((item) => ({
    id: String(item.id),
    name: item.name,
    description: item.description ?? undefined,
    cover: item.cover ?? undefined,
    privacy: item.privacy,
  }));

const toCalendarData = (item: CalendarItem): CalendarData => ({
  id: String(item.id),
  name: item.name,
  description: item.description,
  cover: item.cover,
});

const ProfileHeader = () => (
  <>
    <View style={profileStyles.profileHeaderGreen} />
    <View style={profileStyles.profileHeaderCoral} />
  </>
);

const ProfileAvatar = ({ uri }: { uri?: string }) => (
  <View style={profileStyles.profilePictureContainer}>
    <Image
      source={uri ? { uri } : require('../../../assets/images/default-user.jpg')}
      style={profileStyles.profilePicture}
    />
  </View>
);

const ProfileStats = ({
  calendarsCount,
  totalFollowers,
  totalFollowing,
}: {
  calendarsCount: number;
  totalFollowers: number;
  totalFollowing: number;
}) => (
  <View style={profileStyles.statsContainer}>
    <View style={profileStyles.statItem}>
      <Text style={profileStyles.statNumber}>{calendarsCount}</Text>
      <Text style={profileStyles.statLabel}>Calendars</Text>
    </View>
    <View style={profileStyles.statItem}>
      <Text style={profileStyles.statNumber}>{totalFollowers}</Text>
      <Text style={profileStyles.statLabel}>Followers</Text>
    </View>
    <View style={[profileStyles.statItem, profileStyles.statItemLast]}>
      <Text style={profileStyles.statNumber}>{totalFollowing}</Text>
      <Text style={profileStyles.statLabel}>Following</Text>
    </View>
  </View>
);

const CalendarSectionPill = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) => (
  <View style={profileStyles.calendarSection}>
    <View style={profileStyles.calendarSectionPill}>
      <View style={profileStyles.gridHeaderContainer}>
        <Text style={profileStyles.gridHeaderText}>{title}</Text>
        {count !== undefined && (
          <Text style={profileStyles.gridHeaderCount}>{count}</Text>
        )}
      </View>
      {children}
    </View>
  </View>
);

const OwnProfile = () => {
  const router = useRouter();
  const { user: currentUser, logout } = useAuth();

  const [shownUser, setShownUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<ProfileMetrics>({
    total_followers: 0,
    total_following: 0,
    calendars_count: 0,
  });
  const [myCalendars, setMyCalendars] = useState<CalendarData[]>([]);
  const [followingCalendars, setFollowingCalendars] = useState<CalendarData[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!currentUser) { setShownUser(null); return; }

    let isMounted = true;

    const fetchOwnProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        const data: OwnProfileResponse = await apiClient.get('/users/me/');
        if (!isMounted) return;
        setShownUser(mapUserFromApi(data));
        setMetrics({
          total_followers: data.total_followers ?? 0,
          total_following: data.total_following ?? 0,
          calendars_count: data.calendars?.length ?? 0,
        });
        setMyCalendars(mapCalendarsFromApi(data.calendars));
        setFollowingCalendars(mapCalendarsFromApi(data.following_calendars));
      } catch (error) {
        console.error('Error loading your profile:', error);
        if (isMounted) {
          setProfileError("We couldn't load your profile. Please check your connection and try again.");
        }
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    fetchOwnProfile();
    return () => { isMounted = false; };
  }, [currentUser, reloadKey]);

  const handleLogout = async () => {
    const message = 'Are you sure you want to log out?';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) performLogout();
    } else {
      Alert.alert('Logout', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, exit', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const performLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <ActivityIndicator size="large" color="#10464d" />
      </SafeAreaView>
    );
  }

  if (profileError) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <Text style={profileStyles.errorText}>{profileError}</Text>
        <TouchableOpacity
          style={profileStyles.actionButton}
          onPress={() => setReloadKey((k) => k + 1)}
        >
          <Text style={profileStyles.actionButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!shownUser) return null;

  return (
    <SafeAreaView style={profileStyles.container}>
      <ScrollView style={profileStyles.scrollView}>

        <ProfileHeader />

        <View style={profileStyles.profileSection}>
          <ProfileAvatar uri={shownUser.photo} />

          <Text style={profileStyles.name}>{shownUser.username}</Text>
          {shownUser.pronouns ? (
            <Text style={profileStyles.pronouns}>{shownUser.pronouns}</Text>
          ) : null}

          <View style={profileStyles.bioSection}>
            <Text style={profileStyles.bio}>
              {shownUser.bio || 'Add a bio so others can get to know you.'}
            </Text>
          </View>

          <ProfileStats
            calendarsCount={metrics.calendars_count}
            totalFollowers={metrics.total_followers}
            totalFollowing={metrics.total_following}
          />

          <View style={profileStyles.buttonsRow}>
            <TouchableOpacity
              style={profileStyles.actionButton}
              onPress={() => router.push('/(tabs)/profile/profileEdit' as any)}
            >
              <Text style={profileStyles.actionButtonText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[profileStyles.actionButton, profileStyles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={[profileStyles.actionButtonText, profileStyles.logoutButtonText]}>
                Log out
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={profileStyles.divider} />

        <View style={profileStyles.calendarsWrapper}>
          <CalendarSectionPill title="My calendars" count={myCalendars.length}>
            {myCalendars.length > 0 ? (
              myCalendars.map((cal) => <CalendarCard key={cal.id} calendar={cal} />)
            ) : (
              <Text style={profileStyles.emptyText}>No calendars created yet.</Text>
            )}
          </CalendarSectionPill>

          <CalendarSectionPill title="Following" count={followingCalendars.length}>
            {followingCalendars.length > 0 ? (
              followingCalendars.map((cal) => <CalendarCard key={cal.id} calendar={cal} />)
            ) : (
              <Text style={profileStyles.emptyText}>
                {"You're not following any calendars yet."}
              </Text>
            )}
          </CalendarSectionPill>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const PublicProfile = ({ targetUsername }: { targetUsername: string }) => {
  const { user: currentUser } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  const {
    userBeingViewed,
    calendars,
    isFollowing,
    isLoading,
    userNotFound,
    followError,
    handleFollowToggle,
  } = useUserProfile(targetUsername);

  const { calendars: followingCalendars, loading: followingLoading } =
    useFollowedCalendars(userBeingViewed?.username, {
      enabled: !!userBeingViewed && !!currentUser,
    });

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

        <ProfileHeader />

        <View style={profileStyles.profileSection}>
          <ProfileAvatar uri={userBeingViewed.photo} />

          <Text style={profileStyles.name}>{userBeingViewed.username}</Text>
          {userBeingViewed.pronouns ? (
            <Text style={profileStyles.pronouns}>{userBeingViewed.pronouns}</Text>
          ) : null}

          <View style={profileStyles.bioSection}>
            <Text style={profileStyles.bio}>{userBeingViewed.bio}</Text>
          </View>

          <ProfileStats
            calendarsCount={userBeingViewed.public_calendars?.length ?? 0}
            totalFollowers={userBeingViewed.total_followers || 0}
            totalFollowing={userBeingViewed.total_following || 0}
          />

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
          <CalendarSectionPill
            title="Calendars I follow"
            count={followingCalendars.length > 0 ? followingCalendars.length : undefined}
          >
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
          </CalendarSectionPill>

          <CalendarSectionPill
            title={`${userBeingViewed.username}'s calendars`}
            count={calendars.length}
          >
            {calendars.length > 0 ? (
              calendars.map((cal: CalendarItem) => (
                <CalendarCard key={cal.id} calendar={toCalendarData(cal)} />
              ))
            ) : (
              <Text style={profileStyles.emptyText}>No public calendars yet.</Text>
            )}
          </CalendarSectionPill>
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
};

const ProfileScreen = () => {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user: currentUser } = useAuth();

  const isMe = !username || username === currentUser?.username;

  return isMe ? <OwnProfile /> : <PublicProfile targetUsername={username!} />;
};

export default ProfileScreen;