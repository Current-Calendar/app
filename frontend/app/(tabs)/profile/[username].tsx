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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User } from '../../../types/auth';
import { useAuth } from '@/hooks/use-auth';
import CalendarCard, { CalendarData } from '../../../components/calendar-card';
import profileStyles from '../../../styles/profile-styles';
import PublicProfile from './PublicProfile';
import apiClient from '../../../services/api-client';

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

const ProfileScreen = () => {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();

  const { user: currentUser, logout } = useAuth();

  const isMe = !username || username === currentUser?.username;

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
    if (!isMe) {
      setShownUser(null);
      setMyCalendars([]);
      setFollowingCalendars([]);
      setProfileError(null);
      return;
    }
    if (!currentUser) {
      setShownUser(null);
      return;
    }

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
  }, [isMe, currentUser, reloadKey]);

  const handleRetryProfile = () => setReloadKey((prev) => prev + 1);

  const handleEditProfile = () => {
    if (!currentUser) return;
    router.push('/(tabs)/profileEdit' as any);
  };

  const handleLogout = async () => {
    const message = 'Are you sure you want to log out?';
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm(message);
      if (confirmLogout) performLogout();
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

  if (!isMe && username) {
    return <PublicProfile targetUsername={username} />;
  }

  if (isMe && isLoadingProfile) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <ActivityIndicator size="large" color="#10464d" />
      </SafeAreaView>
    );
  }

  if (isMe && profileError) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <Text style={profileStyles.errorText}>{profileError}</Text>
        <TouchableOpacity style={profileStyles.actionButton} onPress={handleRetryProfile}>
          <Text style={profileStyles.actionButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!shownUser) return null;

  return (
    <SafeAreaView style={profileStyles.container}>
      <ScrollView style={profileStyles.scrollView}>

        <View style={profileStyles.profileHeaderGreen} />
        <View style={profileStyles.profileHeaderCoral} />

        <View style={profileStyles.profileSection}>

          <View style={profileStyles.profilePictureContainer}>
            <Image
              source={
                shownUser.photo
                  ? { uri: shownUser.photo }
                  : require('../../../assets/images/default-user.jpg')
              }
              style={profileStyles.profilePicture}
            />
          </View>

          <Text style={profileStyles.name}>{shownUser.username}</Text>

          {shownUser.pronouns ? (
            <Text style={profileStyles.pronouns}>{shownUser.pronouns}</Text>
          ) : null}

          <View style={profileStyles.bioSection}>
            <Text style={profileStyles.bio}>
              {shownUser.bio || 'Add a bio so others can get to know you.'}
            </Text>
          </View>

          <View style={profileStyles.statsContainer}>
            <View style={profileStyles.statItem}>
              <Text style={profileStyles.statNumber}>{metrics.calendars_count}</Text>
              <Text style={profileStyles.statLabel}>Calendars</Text>
            </View>
            <View style={profileStyles.statItem}>
              <Text style={profileStyles.statNumber}>{metrics.total_followers}</Text>
              <Text style={profileStyles.statLabel}>Followers</Text>
            </View>
            <View style={[profileStyles.statItem, profileStyles.statItemLast]}>
              <Text style={profileStyles.statNumber}>{metrics.total_following}</Text>
              <Text style={profileStyles.statLabel}>Following</Text>
            </View>
          </View>

          <View style={profileStyles.buttonsRow}>
            <TouchableOpacity style={profileStyles.actionButton} onPress={handleEditProfile}>
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

          <View style={profileStyles.calendarSection}>
            <View style={profileStyles.calendarSectionPill}>
              <View style={profileStyles.gridHeaderContainer}>
                <Text style={profileStyles.gridHeaderText}>My calendars</Text>
                <Text style={profileStyles.gridHeaderCount}>{myCalendars.length}</Text>
              </View>
              {myCalendars.length > 0 ? (
                myCalendars.map((cal) => <CalendarCard key={cal.id} calendar={cal} />)
              ) : (
                <Text style={profileStyles.emptyText}>No calendars created yet.</Text>
              )}
            </View>
          </View>

          <View style={profileStyles.calendarSection}>
            <View style={profileStyles.calendarSectionPill}>
              <View style={profileStyles.gridHeaderContainer}>
                <Text style={profileStyles.gridHeaderText}>Following</Text>
                <Text style={profileStyles.gridHeaderCount}>{followingCalendars.length}</Text>
              </View>
              {followingCalendars.length > 0 ? (
                followingCalendars.map((cal) => <CalendarCard key={cal.id} calendar={cal} />)
              ) : (
                <Text style={profileStyles.emptyText}>
                  {"You're not following any calendars yet."}
                </Text>
              )}
            </View>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;