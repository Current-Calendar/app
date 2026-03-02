import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CalendarCard from '../../../components/calendar-card';
import profileStyles from './profileStyles';
import { useAuth } from '../../../context/authContext';
import { useUserProfile, CalendarItem } from '../../../hooks/use-public-profile';
import { User } from '../../../types/user';
import { Calendar } from '../../../types/calendar';

const ProfileScreen = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();

  const isMe = !userId || userId === currentUser?._id;

  // ----- Estado para mi perfil -----
  const [shownUser, setShownUser] = useState<User | null>(null);
  const [myCalendars, setMyCalendars] = useState<Calendar[]>([]);
  const [followingCalendarsMe, setFollowingCalendarsMe] = useState<Calendar[]>([]);
  const [followersCountMe, setFollowersCountMe] = useState<number>(0);
  const [followingCountMe, setFollowingCountMe] = useState<number>(0);

  // ----- Hook para perfil público -----
  const {
    userBeingViewed,
    calendars,
    isFollowing,
    isLoading,
    userNotFound,
    followError,
    handleFollowToggle,
  } = useUserProfile(!isMe ? userId : undefined);

  // ----- Calendarios que sigo del usuario público -----
  const [followingCalendars, setFollowingCalendars] = useState<CalendarItem[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);

  // ----- Inicialización de mi perfil -----
  useEffect(() => {
    if (isMe && currentUser) {
      setShownUser(currentUser);

      setMyCalendars([
        {
          id: '1',
          nombre: 'Travel 2026',
          descripcion: 'Trips planned for 2026',
          portada: 'https://via.placeholder.com/150',
          estado: 'PUBLICO',
          origen: 'CURRENT',
          creador: currentUser._id,
          color: '#A0D842',
        },
        {
          id: '2',
          nombre: 'Food Diary',
          descripcion: 'Best restaurants in Seville',
          portada: 'https://via.placeholder.com/150',
          estado: 'AMIGOS',
          origen: 'CURRENT',
          creador: currentUser._id,
          color: '#FF8C42',
        },
      ]);

      setFollowingCalendarsMe([
        {
          id: '3',
          nombre: 'Fitness Plan',
          descripcion: 'Workout routines',
          portada: 'https://via.placeholder.com/150',
          estado: 'PUBLICO',
          origen: 'CURRENT',
          creador: 'otherUser',
          color: '#42A5F5',
        },
      ]);

      // Mock followers/following para mi perfil
      setFollowersCountMe(123);
      setFollowingCountMe(456);
    }
  }, [isMe, currentUser]);

  // ----- Fetch de calendarios que sigo del usuario público -----
  useEffect(() => {
    const fetchFollowingCalendars = async () => {
      if (!userBeingViewed || !currentUser || isMe) return;

      if (process.env.NODE_ENV === 'development') {
        // Mock: supongamos que seguimos uno de sus calendarios
        const mockFollowed = calendars.filter((cal, idx) => idx % 2 === 0);
        setFollowingCalendars(mockFollowed);
        return;
      }

      try {
        setFollowingLoading(true);
        const token = 'AQUI_VA_EL_TOKEN_DE_TU_SESION';
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'}users/${userBeingViewed.id}/followed_calendars/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.ok) {
          const data: CalendarItem[] = await response.json();
          setFollowingCalendars(data);
        } else {
          setFollowingCalendars([]);
        }
      } catch (error) {
        console.error('Error fetching followed calendars:', error);
        setFollowingCalendars([]);
      } finally {
        setFollowingLoading(false);
      }
    };

    fetchFollowingCalendars();
  }, [userBeingViewed, currentUser, calendars, isMe]);

  const handleEditProfile = () => {
    router.push('/profileEdit');
  };

  // ------------------ RENDER PERFIL PÚBLICO ------------------
  if (!isMe && userId) {
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
          <Text style={profileStyles.errorText}>Este perfil no está disponible.</Text>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={profileStyles.container}>
        <ScrollView style={profileStyles.scrollView}>
          {/* Perfil */}
          <View style={profileStyles.profileSection}>
            <View style={profileStyles.profileRow}>
              <View style={profileStyles.profilePictureContainer}>
                <Image
                  source={{ uri: userBeingViewed.foto || 'https://via.placeholder.com/150' }}
                  style={profileStyles.profilePicture}
                />
              </View>

              <View style={profileStyles.statsContainer}>
                <Text style={profileStyles.name}>{userBeingViewed.username}</Text>
                <Text style={profileStyles.pronouns}>{userBeingViewed.pronombres || 'they/them'}</Text>

                {/* Stats de seguidores y seguidos */}
                <View style={profileStyles.statsRow}>
                  <View style={profileStyles.statItem}>
                    <Text style={profileStyles.statNumber}>{userBeingViewed.total_seguidores || 0}</Text>
                    <Text style={profileStyles.statLabel}>Followers</Text>
                  </View>
                  <View style={profileStyles.statItem}>
                    <Text style={profileStyles.statNumber}>{userBeingViewed.total_seguidos || 0}</Text>
                    <Text style={profileStyles.statLabel}>Following</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={profileStyles.bioSection}>
              <Text style={profileStyles.bio}>{userBeingViewed.biografia}</Text>
            </View>

            <TouchableOpacity
              style={[profileStyles.actionButton, isFollowing && profileStyles.actionButtonAlt]}
              onPress={handleFollowToggle}
            >
              <Text style={[profileStyles.actionButtonText, isFollowing && profileStyles.actionButtonTextAlt]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            {followError && <Text style={profileStyles.errorText}>{followError}</Text>}
          </View>

          {/* Calendarios que sigo del usuario */}
          {followingLoading ? (
            <ActivityIndicator size="small" color="#262626" />
          ) : followingCalendars.length > 0 && (
            <View style={profileStyles.postsGrid}>
              <Text style={profileStyles.gridHeaderText}>{`Calendars I Follow`}</Text>
              {followingCalendars.map((cal) => (
                <CalendarCard
                  key={cal.id}
                  calendario={cal}
                  onPress={() => console.log('Abrir calendario', cal.id)}
                />
              ))}
            </View>
          )}

          {/* Calendarios públicos */}
          <View style={profileStyles.postsGrid}>
            <Text style={profileStyles.gridHeaderText}>{`${userBeingViewed.username}'s Public Calendars`}</Text>

            {calendars.length > 0 ? (
              calendars.map((cal: CalendarItem) => (
                <CalendarCard
                  key={cal.id}
                  calendario={cal}
                  onPress={() => console.log('Abrir calendario', cal.id)}
                />
              ))
            ) : (
              <Text style={profileStyles.emptyText}>No public calendars yet.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------------ RENDER MI PERFIL ------------------
  if (!shownUser) return null;

  return (
    <SafeAreaView style={profileStyles.container}>
      <ScrollView style={profileStyles.scrollView}>
        <View style={profileStyles.profileSection}>
          <View style={profileStyles.profileRow}>
            <View style={profileStyles.profilePictureContainer}>
              <Image
                source={shownUser._photo ? { uri: shownUser._photo } : require('../../../assets/images/default-user.jpg')}
                style={profileStyles.profilePicture}
              />
            </View>

            <View style={profileStyles.statsContainer}>
              <Text style={profileStyles.name}>{shownUser._username}</Text>
              <Text style={profileStyles.fullname}>{shownUser._firstName} {shownUser._lastName}</Text>
              <Text style={profileStyles.pronouns}>{shownUser._pronouns}</Text>

              {/* Stats de seguidores y seguidos */}
              <View style={profileStyles.statsRow}>
                <View style={profileStyles.statItem}>
                  <Text style={profileStyles.statNumber}>{followersCountMe}</Text>
                  <Text style={profileStyles.statLabel}>Followers</Text>
                </View>
                <View style={profileStyles.statItem}>
                  <Text style={profileStyles.statNumber}>{followingCountMe}</Text>
                  <Text style={profileStyles.statLabel}>Following</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={profileStyles.bioSection}>
            <Text style={profileStyles.bio}>{shownUser._bio}</Text>
          </View>

          <TouchableOpacity style={profileStyles.actionButton} onPress={handleEditProfile}>
            <Text style={profileStyles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={profileStyles.postsGrid}>
          <Text style={profileStyles.gridHeaderText}>My Calendars</Text>
          {myCalendars.map((cal) => (
            <CalendarCard key={cal.id} calendario={cal} />
          ))}

          <Text style={profileStyles.gridHeaderText}>Following</Text>
          {followingCalendarsMe.map((cal) => (
            <CalendarCard key={cal.id} calendario={cal} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;