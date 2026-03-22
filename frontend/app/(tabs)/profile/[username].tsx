import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { User } from '../../../types/auth';
import { useAuth } from "@/hooks/use-auth";
import CalendarCard, { CalendarData } from '../../../components/calendar-card';
import profileStyles from './profileStyles';
import PublicProfile from './PublicProfile';
import apiClient, { appendPhoto } from '../../../services/api-client';  
import { useProfileActions } from '@/hooks/use-profile-actions';

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
  
  const { user: currentUser, logout, setUser: updateUserContext } = useAuth();

  // Determinamos si es "Mi Perfil"
  const isMe = !username || username === currentUser?.username;

  const [shownUser, setShownUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<ProfileMetrics>({ total_followers: 0, total_following: 0, calendars_count: 0 });
  const [myCalendars, setMyCalendars] = useState<CalendarData[]>([]);
  const [followingCalendars, setFollowingCalendars] = useState<CalendarData[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
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
          setProfileError('We couldn\'t load your profile. Please check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
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
    const message = "Are you sure you want to log out?";

    if (Platform.OS === 'web') {
        
      const confirmLogout = window.confirm(message);
        if (confirmLogout) {
          performLogout();
        }
      } else {
        
        Alert.alert("Logout", message, [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, exit", style: "destructive", onPress: performLogout },
        ]);
      }
  };

  const performLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);;
  };

  const handleChangePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Permission to access the library is required.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled) return;

      const asset = pickerResult.assets[0];
      setIsUploadingPhoto(true);

      const formData = new FormData();
      await appendPhoto(formData, asset);

      const updated = await apiClient.put<{ user: { photo?: string } }>('/users/me/edit/', formData);
      const newPhoto = updated?.user?.photo ?? asset.uri;

      setShownUser((prev) => prev ? { ...prev, photo: newPhoto } : prev);
      if (currentUser) {
        updateUserContext({ ...currentUser, photo: newPhoto });
      }
    } catch (error) {
      console.error('Error updating photo:', error);
      Alert.alert('Error', 'We couldn\'t update the photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Si no es mi perfil, delegamos a PublicProfile pasándole el username
  if (!isMe && username) {
    return <PublicProfile targetUsername={username} />;
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

  if (!shownUser) return null;

  return (
    <SafeAreaView style={profileStyles.container}>
      <ScrollView style={profileStyles.scrollView}>

        <View style={profileStyles.profileSection}>
          <View style={profileStyles.profileRow}>
            {/* Foto de perfil con botón de cambio */}
            <TouchableOpacity
              style={profileStyles.profilePictureContainer}
              onPress={handleChangePhoto}
              disabled={isUploadingPhoto}
            >
              <Image
                source={shownUser.photo ? { uri: shownUser.photo } : require('../../../assets/images/default-user.jpg')}
                style={profileStyles.profilePicture}
              />
              {isUploadingPhoto ? (
                <View style={profileStyles.photoOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : (
                <View style={profileStyles.photoOverlay}>
                  <Text style={profileStyles.photoOverlayText}>✎</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Métricas: calendarios, seguidores, seguidos */}
            <View style={profileStyles.statsContainer}>
              <Text style={profileStyles.name}>{shownUser.username}</Text>
              {shownUser.pronouns ? (
                <Text style={profileStyles.pronouns}>{shownUser.pronouns}</Text>
              ) : null}

              <View style={profileStyles.statsRow}>
                <View style={profileStyles.statItem}>
                  <Text style={profileStyles.statNumber}>{metrics.calendars_count}</Text>
                  <Text style={profileStyles.statLabel}>Calendars</Text>
                </View>
                <View style={profileStyles.statItem}>
                  <Text style={profileStyles.statNumber}>{metrics.total_followers}</Text>
                  <Text style={profileStyles.statLabel}>Followers</Text>
                </View>
                <View style={profileStyles.statItem}>
                  <Text style={profileStyles.statNumber}>{metrics.total_following}</Text>
                  <Text style={profileStyles.statLabel}>Following</Text>
                </View>
              </View>
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
          {myCalendars.length > 0 ? (
            myCalendars.map((cal) => (
              <CalendarCard key={cal.id} calendar={cal} />
            ))
          ) : (
            <Text style={profileStyles.emptyText}>No tienes calendarios creados aún.</Text>
          )}

          <Text style={profileStyles.gridHeaderText}>Following</Text>
          {followingCalendars.length > 0 ? (
            followingCalendars.map((cal) => (
              <CalendarCard key={cal.id} calendar={cal} />
            ))
          ) : (
            <Text style={profileStyles.emptyText}>No sigues ningún calendario aún.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
