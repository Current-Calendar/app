import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User } from '../../../types/user';
import { Calendar } from '../../../types/calendar';
import { useAuth } from '../../../context/authContext'; 
import CalendarCard from '../../../components/calendar-card';
import { API_CONFIG } from '../../../constants/api';

const ProfileScreen = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser, setUser } = useAuth();
  const isMe = userId === currentUser?._id;

  const [shownUser, setShownUser] = useState<User | null>(null);
  const [myCalendars, setMyCalendars] = useState<Calendar[]>([]);
  const [followingCalendars, setFollowingCalendars] = useState<Calendar[]>([]);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  useEffect(() => {
    if (isMe) {
      // if viewing own profile, use currentUser from context
      setShownUser(currentUser);
    } else {
      // if viewing someone else’s profile, fetch their data from API based on userId, TODO: replace with real API call
      const fetchUser = async () => {
        const fetchedUser: User = {
          _id: userId || 'abc123',
          _username: isMe ? currentUser?._username : 'Other User',
          _firstName: isMe ? currentUser?._firstName : undefined,
          _lastName: isMe ? currentUser?._lastName : undefined,
          _bio: isMe ? currentUser?._bio : 'This is a sample bio for an unknown user.',
          _pronouns: isMe ? currentUser?._pronouns : 'they/them',
          _email: 'example@example.com'
        };
        setShownUser(fetchedUser);
      }
        fetchUser();
    };
      //TODO: fetch my calendars from API based on userId (shownUser._id)
      //TODO: fetch following calendars from API based on userId (currentUser._id)
      setMyCalendars([
        {
          id: '1',
          nombre: 'Travel 2026',
          descripcion: 'Trips planned for 2026',
          portada: 'https://via.placeholder.com/150',
          estado: 'PUBLICO',
          origen: 'CURRENT',
          creador: userId || 'abc123',
          color: '#A0D842',
        },
        {
          id: '2',
          nombre: 'Food Diary',
          descripcion: 'Best restaurants in Seville',
          portada: 'https://via.placeholder.com/150',
          estado: 'AMIGOS',
          origen: 'CURRENT',
          creador: userId || 'abc123',
          color: '#FF8C42',
        },
      ]);
      if (isMe) {
        setFollowingCalendars([
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
      }
  }, [currentUser, isMe, userId]);

  const handleEditProfile = () => {
    if (!currentUser) return;
    router.push('/profileEdit');
  };

  const handleFollow = () => {
    //TODO: Implement follow/unfollow logic
  };

  const deleteOwnProfile = async () => {
    if (!currentUser) {
      Alert.alert('Session required', 'You must be logged in to delete your profile.');
      return;
    }

    setIsDeletingProfile(true);
    try {
      const response = await fetch(API_CONFIG.endpoints.deleteOwnProfile, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setUser(null);
      Alert.alert('Profile deleted', 'Your profile was deleted successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace('/calendars'),
        },
      ]);
    } catch (error) {
      console.error('Error deleting profile:', error);
      Alert.alert('Delete failed', 'Could not delete your profile. Please try again.');
    } finally {
      setIsDeletingProfile(false);
    }
  };

  const handleDeleteProfile = () => {
    if (isDeletingProfile) {
      return;
    }

    Alert.alert(
      'Delete profile',
      'Are you sure you want to delete your profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteOwnProfile();
          },
        },
      ]
    );
  };

  if (!shownUser) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>

        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            <View style={styles.profilePictureContainer}>
              <Image
                source={shownUser._photo ? { uri: shownUser._photo } : require('../../../assets/images/default-user.jpg')}
                style={styles.profilePicture}
              />
            </View>

            <View style={styles.statsContainer}>
              <Text style={styles.name}>{shownUser._username}</Text>
              <Text style={styles.fullname}>{shownUser._firstName} {shownUser._lastName}</Text>
              <Text style={styles.pronouns}>{shownUser._pronouns}</Text>
              {/* <Text style={styles.statNumber}>
                {user._followersCount}
              </Text>
              <Text style={styles.statLabel}>Followers</Text> */}
            </View>
          </View>

          <View style={styles.bioSection}>
            <Text style={styles.bio}>{shownUser._bio}</Text>
          </View>

          {isMe ? (
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile} disabled={isDeletingProfile}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteProfileButton, isDeletingProfile && styles.deleteProfileButtonDisabled]}
                onPress={handleDeleteProfile}
                disabled={isDeletingProfile}
                activeOpacity={0.8}
              >
                {isDeletingProfile ? (
                  <ActivityIndicator size="small" color="#B33F37" />
                ) : (
                  <Text style={styles.deleteProfileButtonText}>Delete Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.postsGrid}>
          {isMe ? (
            <>
              <Text style={styles.gridHeaderText}>My Calendars</Text>
              {myCalendars.map((cal) => (
                <CalendarCard
                  key={cal.id}
                  calendario={cal}
                  //onPress={() => router.push(`/calendar/${cal.id}`)} TODO: add calendar details page
                />
              ))}

              <Text style={styles.gridHeaderText}>Following</Text>
              {followingCalendars.map((cal) => (
                <CalendarCard
                  key={cal.id}
                  calendario={cal}
                  //onPress={() => router.push(`/calendar/${cal.id}`)} TODO: add calendar details page 
                />
              ))}
            </>
          ) : (
            <>
              <Text style={styles.gridHeaderText}>{shownUser?._username}&apos;s Calendars</Text>
              {myCalendars.map((cal) => (
                <CalendarCard
                  key={cal.id}
                  calendario={cal}
                  //onPress={() => router.push(`/calendar/${cal.id}`)} TODO: add calendar details page
                />
              ))}
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffded',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePictureContainer: {
    marginRight: 28,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 200,
    borderWidth: 2,
    borderColor: '#dbdbdb',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'column'
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  statLabel: {
    fontSize: 13,
    color: '#737373',
    marginTop: 2,
  },
  bioSection: {
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
  },
  fullname: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#262626',
  },
  pronouns: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6868689a',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
  },
  actionsContainer: {
    marginBottom: 16,
    gap: 10,
  },
  editButton: {
    backgroundColor: '#eb8c85',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    maxWidth: 500,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteProfileButton: {
    borderWidth: 1.5,
    borderColor: '#eb8c85',
    backgroundColor: '#eb8c8514',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    maxWidth: 500,
  },
  deleteProfileButtonDisabled: {
    opacity: 0.7,
  },
  deleteProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B33F37',
  },
  postsGrid: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
    
  },
  gridHeaderText: {
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
    followButton: {
      backgroundColor: '#4CAF50',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 16,
      maxWidth: 500,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  }
});

export default ProfileScreen;
