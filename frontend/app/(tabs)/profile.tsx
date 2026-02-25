import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

interface User {
  name: string;
  bio: string;
  pronouns: string;
  photo: string;
  followers: number;
}

const ProfileScreen = () => {
  const router = useRouter();

  // Sample user data
  const user: User = {
    name: 'María Calendarios',
    bio: 'Seville, Spain | Travel Enthusiast | Food Lover | Sharing my adventures one post at a time',
    pronouns: 'she/her',
    photo: '../../assets/images/icon.png',
    followers: 12345
  };

  const handleEditProfile = () => {
    router.push({
      pathname: '/profileEdit',
      params: {
        name: user.name,
        bio: user.bio,
        pronouns: user.pronouns,
        photo: user.photo,
        followers: user.followers.toString(),
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>

        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            <View style={styles.profilePictureContainer}>
              <Image
                source={require('../../assets/images/icon.png')} // {/* TODO: change require imported pic */}
                style={styles.profilePicture}
              />
            </View>
            <View style={styles.statsContainer}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.pronouns}>{user.pronouns}</Text>
                <Text style={styles.statNumber}>{user.followers.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Followers</Text>
            </View>
          </View>
          <View style={styles.bioSection}>
            <Text style={styles.bio}>{user.bio}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        {/* TODO: grid/list of calendars*/}
        <View style={styles.postsGrid}>
            <Text style={styles.gridHeaderText}>My calendars</Text>
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
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
  },
  pronouns: {
    fontSize: 12,
    fontWeight: '700',
    color: '#686868',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
  },
  editButton: {
    backgroundColor: '#eb8c85',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: 500,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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
  }
});

export default ProfileScreen;