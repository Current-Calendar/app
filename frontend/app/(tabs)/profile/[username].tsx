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
import * as ImagePicker from 'expo-image-picker';
import { User } from '../../../types/auth';
import { useAuth } from "@/hooks/use-auth";
import CalendarCard, { CalendarData } from '../../../components/calendar-card';
import CommentsModalC from '../../../components/comments-modal-c';
import profileStyles from '../../../styles/profile-styles';
import apiClient, { appendPhoto } from '../../../services/api-client';  
import { useProfileActions } from '@/hooks/use-profile-actions';
import LogoutModal from '../../../components/logout-modal';

import { useUserProfile, CalendarItem } from '../../../hooks/use-public-profile';
import { useFollowedCalendars } from '../../../hooks/use-followed-calendars';
import { ReportModal } from '@/components/report-modal';
import { Calendar } from '@/types/calendar';

type OwnProfileCalendarResponse = {
  id: number;
  name: string;
  description?: string | null;
  cover?: string | null;
  privacy: string;
  origin: string;
  creator: string;
  created_at: string;
  likes_count?: number;
  liked_by_me?: boolean;
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
    likes_count: item.likes_count ?? 0,
    liked_by_me: item.liked_by_me ?? false,
  }));

const toCalendarData = (item: CalendarItem): CalendarData => ({
  id: String(item.id),
  name: item.name,
  description: item.description,
  cover: item.cover,
  likes_count: (item as any).likes_count ?? 0,
  liked_by_me: (item as any).liked_by_me ?? false,
});

const handleLikeInList = async (
  id: string,
  setter: React.Dispatch<React.SetStateAction<CalendarData[]>>
) => {
  try {
    const res = await apiClient.post<{ liked: boolean; likes_count: number }>(
      `/calendars/${id}/like/`
    );
    setter((prev) =>
      prev.map((cal) =>
        String(cal.id) === id
          ? { ...cal, liked_by_me: res.liked, likes_count: res.likes_count }
          : cal
      )
    );
  } catch (error) {
    Alert.alert('Error', 'Could not like this calendar.');
    console.error('Like error:', error);
  }
};

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
  const { username } = useLocalSearchParams<{ username: string }>();

  const { user: currentUser, logout, setUser: updateUserContext } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const performLogout = async () => {
    setShowLogoutModal(false); 
    await logout();            
    router.replace('/login'); 
  };

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
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [commentsVisible, setCommentsVisible] = useState(false);

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

  const handleLikeMy = (id: string) => handleLikeInList(id, setMyCalendars);
  const handleLikeFollowing = (id: string) => handleLikeInList(id, setFollowingCalendars);

  const handleComment = (id: string, list: CalendarData[]) => {
    const found = list.find((c) => String(c.id) === id);
    if (found) {
      setSelectedCalendar({
        id: found.id as string,
        name: found.name,
        description: found.description || '',
        privacy: (found.privacy as 'PRIVATE' | 'FRIENDS' | 'PUBLIC') || 'PUBLIC',
        origin: 'CURRENT',
        creator: '',
        color: '#10464d',
        cover: found.cover ?? undefined,
        likes_count: found.likes_count ?? 0,
        liked_by_me: found.liked_by_me ?? false,
      });
      setCommentsVisible(true);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true); 
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
              myCalendars.map((cal) => (
                <CalendarCard
                  key={cal.id}
                  calendar={cal}
                  onPress={() => router.push(`/calendar-view?calendarId=${cal.id}` as any)}
                  onLike={handleLikeMy}
                  onComment={(id) => handleComment(id, myCalendars)}
                />
              ))
            ) : (
              <Text style={profileStyles.emptyText}>No calendars created yet.</Text>
            )}
          </CalendarSectionPill>

          <CalendarSectionPill title="Following" count={followingCalendars.length}>
            {followingCalendars.length > 0 ? (
              followingCalendars.map((cal) => (
                <CalendarCard
                  key={cal.id}
                  calendar={cal}
                  onPress={() => router.push(`/calendar-view?calendarId=${cal.id}` as any)}
                  onLike={handleLikeFollowing}
                  onComment={(id) => handleComment(id, followingCalendars)}
                />
              ))
            ) : (
              <Text style={profileStyles.emptyText}>
                {"You're not following any calendars yet."}
              </Text>
            )}
          </CalendarSectionPill>
        </View>

      </ScrollView>

      {/* AQUÍ INVOCAMOS TU NUEVO MODAL DE LEGO */}
      <LogoutModal 
        visible={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={performLogout} 
      />

      <CommentsModalC
        visible={commentsVisible}
        onClose={() => { setCommentsVisible(false); setSelectedCalendar(null); }}
        calendar={selectedCalendar}
      />
    </SafeAreaView>
  );
};

const PublicProfile = ({ targetUsername }: { targetUsername: string }) => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [followingCalendarsData, setFollowingCalendarsData] = useState<CalendarData[]>([]);
  const [publicCalendarsData, setPublicCalendarsData] = useState<CalendarData[]>([]);

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

  useEffect(() => {
    setFollowingCalendarsData(followingCalendars.map(toCalendarData));
  }, [followingCalendars]);

  useEffect(() => {
    setPublicCalendarsData(calendars.map(toCalendarData));
  }, [calendars]);

  const handleLikeFollowing = (id: string) => handleLikeInList(id, setFollowingCalendarsData);
  const handleLikePublic = (id: string) => handleLikeInList(id, setPublicCalendarsData);

  const handleComment = (id: string, list: CalendarData[]) => {
    const found = list.find((c) => String(c.id) === id);
    if (found) {
      setSelectedCalendar({
        id: found.id as string,
        name: found.name,
        description: found.description || '',
        privacy: (found.privacy as 'PRIVATE' | 'FRIENDS' | 'PUBLIC') || 'PUBLIC',
        origin: 'CURRENT',
        creator: '',
        color: '#10464d',
        cover: found.cover ?? undefined,
        likes_count: found.likes_count ?? 0,
        liked_by_me: found.liked_by_me ?? false,
      });
      setCommentsVisible(true);
    }
  };

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
            count={followingCalendarsData.length > 0 ? followingCalendarsData.length : undefined}
          >
            {!currentUser ? (
              <Text style={profileStyles.emptyText}>
                Log in to see which calendars from this profile you follow.
              </Text>
            ) : followingLoading ? (
              <ActivityIndicator size="small" color="#10464d" style={{ marginVertical: 8 }} />
            ) : followingCalendarsData.length > 0 ? (
              followingCalendarsData.map((cal) => (
                <CalendarCard
                  key={cal.id}
                  calendar={cal}
                  onPress={() => router.push(`/calendar-view?calendarId=${cal.id}` as any)}
                  onLike={handleLikeFollowing}
                  onComment={(id) => handleComment(id, followingCalendarsData)}
                />
              ))
            ) : (
              <Text style={profileStyles.emptyText}>
                {"You're not following any calendars from this profile."}
              </Text>
            )}
          </CalendarSectionPill>

          <CalendarSectionPill
            title={`${userBeingViewed.username}'s calendars`}
            count={publicCalendarsData.length}
          >
            {publicCalendarsData.length > 0 ? (
              publicCalendarsData.map((cal) => (
                <CalendarCard
                  key={cal.id}
                  calendar={cal}
                  onPress={() => router.push(`/calendar-view?calendarId=${cal.id}` as any)}
                  onLike={handleLikePublic}
                  onComment={(id) => handleComment(id, publicCalendarsData)}
                />
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

      <CommentsModalC
        visible={commentsVisible}
        onClose={() => { setCommentsVisible(false); setSelectedCalendar(null); }}
        calendar={selectedCalendar}
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