import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '@/hooks/use-auth';
import CalendarCard, { CalendarData } from '../../../components/calendar-card';
import CommentsModalC from '../../../components/comments-modal-c';
import { ConfirmDeleteModal } from '../../../components/confirm-delete-modal';
import profileStyles from '../../../styles/profile-styles';
import apiClient from '../../../services/api-client';
import LogoutModal from '../../../components/logout-modal';
import { ReportModal } from '@/components/report-modal';
import { Calendar } from '@/types/calendar';
import FollowListModal from '../../../components/follow-list-modal';
import { useUserFollows } from '@/hooks/use-user-follows';
import { useProfileQuery, ProfileCalendarData } from '../../../hooks/querys/use-profile-query';

const toCalendarData = (item: ProfileCalendarData): CalendarData => ({
  id: String(item.id),
  name: item.name,
  description: item.description,
  cover: item.cover,
  privacy: item.privacy,
  likes_count: item.likesCount ?? 0,
  liked_by_me: item.likedByMe ?? false,
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

const PlanBadge = ({ plan }: { plan?: string }) => {
  if (plan === 'STANDARD') {
    return (
      <View style={{ backgroundColor: '#eb8c85', borderRadius: 10, padding: 2 }}>
        <Ionicons name="star" size={14} color="#fff" />
      </View>
    );
  }
  if (plan === 'BUSINESS') {
    return (
      <View style={{ backgroundColor: 'gold', borderRadius: 10, padding: 2 }}>
        <Ionicons name="star" size={14} color="#fff" />
      </View>
    );
  }
  return null;
};

const StatBox = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) => {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={profileStyles.statItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={profileStyles.statNumber}>{value}</Text>
      <Text style={profileStyles.statLabel}>{label}</Text>
    </Wrapper>
  );
};

const ProfileStats = ({
  calendarsCount,
  totalFollowers,
  totalFollowing,
  onPressFollowers,
  onPressFollowing,
}: {
  calendarsCount: number;
  totalFollowers: number;
  totalFollowing: number;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}) => (
  <View style={profileStyles.statsContainer}>
    <StatBox label="Calendars" value={calendarsCount} />
    <StatBox label="Followers" value={totalFollowers} onPress={onPressFollowers} />
    <StatBox label="Following" value={totalFollowing} onPress={onPressFollowing} />
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

function useCalendarInteractions() {
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [commentsVisible, setCommentsVisible] = useState(false);

  const handleComment = useCallback((id: string, list: CalendarData[]) => {
    const found = list.find((c) => String(c.id) === id);
    if (!found) return;
    setSelectedCalendar({
      id: found.id as string,
      name: found.name,
      description: found.description || '',
      privacy: (found.privacy as 'PRIVATE' | 'PUBLIC') || 'PUBLIC',
      origin: 'CURRENT',
      creator: '',
      color: '#10464d',
      cover: found.cover ?? undefined,
      likes_count: found.likes_count ?? 0,
      liked_by_me: found.liked_by_me ?? false,
    });
    setCommentsVisible(true);
  }, []);

  const closeComments = useCallback(() => {
    setCommentsVisible(false);
    setSelectedCalendar(null);
  }, []);

  return { selectedCalendar, commentsVisible, handleComment, closeComments };
}

const OwnProfile = () => {
  const router = useRouter();
  const { user: currentUser, logout } = useAuth();

  const { data, loading, error, reload } = useProfileQuery(currentUser?.username);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const [myCalendars, setMyCalendars] = useState<CalendarData[]>([]);
  const [followingCalendars, setFollowingCalendars] = useState<CalendarData[]>([]);

  useEffect(() => {
    if (!data) return;
    setMyCalendars([
      ...data.publicCalendars.map(toCalendarData),
      ...data.privateCalendars.map(toCalendarData),
    ]);
    setFollowingCalendars(data.followingCalendars.map(toCalendarData));
  }, [data]);

  const [activeFollowList, setActiveFollowList] = useState<'followers' | 'following' | null>(null);
  const { followers, following, loading: followsLoading, reload: reloadFollows } = useUserFollows(
    data?.user.id,
    Boolean(data)
  );
  const openFollowList = (type: 'followers' | 'following') => {
    setActiveFollowList(type);
    reloadFollows();
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const [unsubscribeModalVisible, setUnsubscribeModalVisible] = useState(false);
  const [pendingUnsubscribeId, setPendingUnsubscribeId] = useState<string | null>(null);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  const openUnsubscribeModal = (id: string) => {
    setPendingUnsubscribeId(id);
    setUnsubscribeModalVisible(true);
  };
  const cancelUnsubscribe = () => {
    if (isUnsubscribing) return;
    setUnsubscribeModalVisible(false);
    setPendingUnsubscribeId(null);
  };
  const confirmUnsubscribe = async () => {
    if (!pendingUnsubscribeId) return;
    setIsUnsubscribing(true);
    try {
      const response = await apiClient.post<{ subscribed: boolean; calendar_id: number }>(
        `/calendars/${pendingUnsubscribeId}/subscribe/`
      );
      if (!response.subscribed) {
        setFollowingCalendars((prev) => prev.filter((c) => String(c.id) !== pendingUnsubscribeId));
      }
      setUnsubscribeModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not unsubscribe from this calendar. Please try again.');
    } finally {
      setIsUnsubscribing(false);
      setPendingUnsubscribeId(null);
    }
  };

  const { selectedCalendar, commentsVisible, handleComment, closeComments } =
    useCalendarInteractions();

  const handleLikeMy = (id: string) => handleLikeInList(id, setMyCalendars);
  const handleLikeFollowing = (id: string) => handleLikeInList(id, setFollowingCalendars);

  if (loading) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <ActivityIndicator size="large" color="#10464d" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <Text style={profileStyles.errorText}>{error}</Text>
        <TouchableOpacity style={profileStyles.actionButton} onPress={reload}>
          <Text style={profileStyles.actionButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const { user, totalFollowers, totalFollowing } = data;

  return (
    <SafeAreaView style={profileStyles.container}>
      <ScrollView style={profileStyles.scrollView} contentContainerStyle={{ paddingBottom: 64 }}>
        <ProfileHeader />

        <View style={profileStyles.profileSection}>
          <ProfileAvatar uri={user.photo} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Text style={profileStyles.name}>{user.username}</Text>
            <PlanBadge plan={user.plan} />
          </View>

          {user.pronouns ? <Text style={profileStyles.pronouns}>{user.pronouns}</Text> : null}

          <View style={profileStyles.bioSection}>
            <Text style={profileStyles.bio}>
              {user.bio || 'Add a bio so others can get to know you.'}
            </Text>
          </View>

          <ProfileStats
            calendarsCount={myCalendars.length}
            totalFollowers={totalFollowers}
            totalFollowing={totalFollowing}
            onPressFollowers={() => openFollowList('followers')}
            onPressFollowing={() => openFollowList('following')}
          />

          <View style={profileStyles.buttonsRow}>
            <TouchableOpacity
              style={[profileStyles.actionButton, profileStyles.logoutButton]}
              onPress={() => setShowLogoutModal(true)}
            >
              <Text style={[profileStyles.actionButtonText, profileStyles.logoutButtonText]}>
                Log out
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[profileStyles.actionButton, profileStyles.settingsButton]}
              onPress={() => router.push('/settings' as any)}
            >
              <Text style={[profileStyles.actionButtonText, profileStyles.logoutButtonText]}>
                Settings
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
                  onUnsubscribe={openUnsubscribeModal}
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

      <FollowListModal
        visible={Boolean(activeFollowList)}
        title={activeFollowList === 'followers' ? 'Seguidores' : 'Seguidos'}
        users={activeFollowList === 'followers' ? followers : following}
        loading={followsLoading}
        onClose={() => setActiveFollowList(null)}
      />

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={performLogout}
        loading={isLoggingOut}
      />

      <ConfirmDeleteModal
        visible={unsubscribeModalVisible}
        title="Unfollow calendar"
        message="Are you sure you want to stop following this calendar?"
        confirmLabel="Accept"
        cancelLabel="Cancel"
        loading={isUnsubscribing}
        onCancel={cancelUnsubscribe}
        onConfirm={confirmUnsubscribe}
      />

      <CommentsModalC
        visible={commentsVisible}
        onClose={closeComments}
        calendar={selectedCalendar}
      />
    </SafeAreaView>
  );
};

const PublicProfile = ({ targetUsername }: { targetUsername: string }) => {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const { data, loading, error } = useProfileQuery(targetUsername);

  const [followingCalendarsData, setFollowingCalendarsData] = useState<CalendarData[]>([]);
  const [publicCalendarsData, setPublicCalendarsData] = useState<CalendarData[]>([]);

  useEffect(() => {
    if (!data) return;
    setFollowingCalendarsData(data.followingCalendars.map(toCalendarData));
    setPublicCalendarsData(data.publicCalendars.map(toCalendarData));
  }, [data]);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [localFollowersCount, setLocalFollowersCount] = useState(0);

  useEffect(() => {
    if (data) {
      setIsFollowing(data.isFollowing);
      setLocalFollowersCount(data.totalFollowers);
    }
  }, [data]);

  const handleFollowToggle = async () => {
    if (!data) return;
    setFollowError(null);
    try {
      const res = await apiClient.post<{ followed: boolean }>(
        `/users/${data.user.id}/follow/`
      );
      setIsFollowing(res.followed);
      setLocalFollowersCount((prev) => (res.followed ? prev + 1 : prev - 1));
    } catch {
      setFollowError('Could not update follow status. Please try again.');
    }
  };

  const [activeFollowList, setActiveFollowList] = useState<'followers' | 'following' | null>(null);
  const { followers, following, loading: followsLoading, reload: reloadFollows } = useUserFollows(
    data?.user.id,
    Boolean(data)
  );
  const openFollowList = (type: 'followers' | 'following') => {
    setActiveFollowList(type);
    reloadFollows();
  };

  const [reportOpen, setReportOpen] = useState(false);

  const { selectedCalendar, commentsVisible, handleComment, closeComments } =
    useCalendarInteractions();

  const handleLikeFollowing = (id: string) => handleLikeInList(id, setFollowingCalendarsData);
  const handleLikePublic = (id: string) => handleLikeInList(id, setPublicCalendarsData);

  if (loading) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <ActivityIndicator size="large" color="#10464d" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <Ionicons name="person-remove-outline" size={60} color="#dddcce" />
        <Text style={profileStyles.errorText}>
          {error ?? 'This profile is not available.'}
        </Text>
      </SafeAreaView>
    );
  }

  const { user, totalFollowing } = data;

  return (
    <SafeAreaView style={profileStyles.container}>
      <ScrollView style={profileStyles.scrollView}>
        <ProfileHeader />

        <View style={profileStyles.profileSection}>
          <ProfileAvatar uri={user.photo} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Text style={profileStyles.name}>{user.username}</Text>
            <PlanBadge plan={user.plan} />
          </View>

          {user.pronouns ? <Text style={profileStyles.pronouns}>{user.pronouns}</Text> : null}

          <View style={profileStyles.bioSection}>
            <Text style={profileStyles.bio}>{user.bio}</Text>
          </View>

          <ProfileStats
            calendarsCount={publicCalendarsData.length}
            totalFollowers={localFollowersCount}
            totalFollowing={totalFollowing}
            onPressFollowers={() => openFollowList('followers')}
            onPressFollowing={() => openFollowList('following')}
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

          {followError ? <Text style={profileStyles.errorText}>{followError}</Text> : null}
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
            title={`${user.username}'s calendars`}
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

      <FollowListModal
        visible={Boolean(activeFollowList)}
        title={activeFollowList === 'followers' ? 'Seguidores' : 'Seguidos'}
        users={activeFollowList === 'followers' ? followers : following}
        loading={followsLoading}
        onClose={() => setActiveFollowList(null)}
      />

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedType="USER"
        reportedId={user.id}
        reportedLabel={user.username}
      />

      <CommentsModalC
        visible={commentsVisible}
        onClose={closeComments}
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