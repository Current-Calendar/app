import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User } from '../../../types/auth';
import { Calendar } from '../../../types/calendar';
import { useAuth } from "@/hooks/use-auth";
import CalendarCard from '../../../components/calendar-card';
import profileStyles from './profileStyles';
import PublicProfile from './PublicProfile'; 
import { useProfileActions } from '@/hooks/use-profile-actions';

const ACCENT_COLORS = ['#A0D842', '#FF8C42', '#42A5F5', '#6C5DD3', '#E96F92'];

type OwnProfileCalendarResponse = {
  id: number;
  name: string;
  description?: string | null;
  cover?: string | null;
  privacy: Calendar['privacy'];
  origin: Calendar['origin'];
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

const mapUserFromApi = (payload: OwnProfileResponse): User => ({
  id: payload.id,
  username: payload.username,
  email: payload.email,
  bio: payload.bio ?? undefined,
  pronouns: payload.pronouns ?? undefined,
  photo: payload.photo ?? undefined,
});

const mapCalendarsFromApi = (
  items: OwnProfileCalendarResponse[],
  offset = 0,
): Calendar[] =>
  items.map((item, index) => ({
    id: String(item.id),
    name: item.name,
    description: item.description ?? '',
    cover: item.cover ?? undefined,
    privacy: item.privacy,
    origin: item.origin,
    creator: item.creator,
    color: ACCENT_COLORS[(offset + index) % ACCENT_COLORS.length],
  }));

const ProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { user: currentUser, logout } = useAuth();
  const { getOwnProfile } = useProfileActions();
  
  // Determinamos si es "Mi Perfil": sin userId, o coincide con el id numérico o el username del usuario actual
  const isMe = !userId
    || userId === String(currentUser?.id)
    || (!!currentUser?.username && userId.toLowerCase() === currentUser.username.toLowerCase());

  const [shownUser, setShownUser] = useState<User | null>(null);
  const [myCalendars, setMyCalendars] = useState<Calendar[]>([]);
  const [followingCalendars, setFollowingCalendars] = useState<Calendar[]>([]);
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

    const controller = new AbortController();
    let isMounted = true;

    const fetchOwnProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);

      try {
        const data: OwnProfileResponse = await getOwnProfile();

        if (!isMounted) {
          return;
        }

        setShownUser(mapUserFromApi(data));
        const ownedCalendars = mapCalendarsFromApi(data.calendars);
        setMyCalendars(ownedCalendars);
        setFollowingCalendars(
          mapCalendarsFromApi(data.following_calendars, ownedCalendars.length),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        console.error('Error cargando perfil propio:', error);
        if (isMounted) {
          setProfileError('No hemos podido cargar tu perfil. Intenta de nuevo.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    fetchOwnProfile();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isMe, currentUser, currentUser?.id, getOwnProfile, reloadKey]);

  const handleRetryProfile = () => setReloadKey((prev) => prev + 1);

  const handleEditProfile = () => {
    if (!currentUser) return;
    router.push('/profileEdit');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Si no es mi perfil, delegamos a PublicProfile pasándole el userId
  if (!isMe && userId) {
    return <PublicProfile targetUserId={userId} />;
  }

  if (isMe && isLoadingProfile) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <ActivityIndicator size="large" color="#164E52" />
      </SafeAreaView>
    );
  }

  if (isMe && profileError) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <Text style={profileStyles.errorText}>{profileError}</Text>
        <TouchableOpacity style={profileStyles.actionButton} onPress={handleRetryProfile}>
          <Text style={profileStyles.actionButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Si SOY YO, seguimos hacia abajo y renderizamos "Mi Perfil"
  if (!shownUser) return null;

  return (
    <SafeAreaView style={profileStyles.container}>
      <ScrollView style={profileStyles.scrollView}>

        <View style={profileStyles.profileSection}>
          <View style={profileStyles.profileRow}>
            <View style={profileStyles.profilePictureContainer}>
              <Image
                source={shownUser.photo ? { uri: shownUser.photo } : require('../../../assets/images/default-user.jpg')}
                style={profileStyles.profilePicture}
              />
            </View>

            <View style={profileStyles.statsContainer}>
              <Text style={profileStyles.name}>{shownUser.username}</Text>
              <Text style={profileStyles.fullname}>
                {shownUser.username}
              </Text>
              <Text style={profileStyles.pronouns}>{shownUser.pronouns || ''}</Text>
            </View>
          </View>

          <View style={profileStyles.bioSection}>
            <Text style={profileStyles.bio}>{shownUser.bio || 'Añade una biografía para que otros te conozcan.'}</Text>
          </View>

          <TouchableOpacity style={profileStyles.actionButton} onPress={handleEditProfile}>
            <Text style={profileStyles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[profileStyles.actionButton, profileStyles.logoutButton]} onPress={handleLogout}>
            <Text style={[profileStyles.actionButtonText, profileStyles.logoutButtonText]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={profileStyles.postsGrid}>
          <Text style={profileStyles.gridHeaderText}>My Calendars</Text>
          {myCalendars.map((cal) => (
            <CalendarCard key={cal.id} calendar={cal} />
          ))}

          <Text style={profileStyles.gridHeaderText}>Following</Text>
          {followingCalendars.map((cal) => (
            <CalendarCard key={cal.id} calendar={cal} />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;