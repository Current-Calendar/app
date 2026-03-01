import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User } from '../../../types/user';
import { Calendar } from '../../../types/calendar';
import { useAuth } from '../../../context/authContext'; 
import CalendarCard from '../../../components/calendar-card';

// Importamos tu componente público
import PublicProfile from './PublicProfile'; // Ajusta la ruta si es necesario

const ProfileScreen = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  
  // Determinamos si es "Mi Perfil"
  const isMe = !userId || userId === currentUser?._id;

  const [shownUser, setShownUser] = useState<User | null>(null);
  const [myCalendars, setMyCalendars] = useState<Calendar[]>([]);
  const [followingCalendars, setFollowingCalendars] = useState<Calendar[]>([]);

  useEffect(() => {
    // ESTE ARCHIVO AHORA SOLO GESTIONA "MI PERFIL"
    if (isMe) {
      setShownUser(currentUser);
      
      setMyCalendars([
        {
          id: '1', nombre: 'Travel 2026', descripcion: 'Trips planned for 2026',
          portada: 'https://via.placeholder.com/150', estado: 'PUBLICO', origen: 'CURRENT',
          creador: currentUser?._id || 'abc123', color: '#A0D842',
        },
        {
          id: '2', nombre: 'Food Diary', descripcion: 'Best restaurants in Seville',
          portada: 'https://via.placeholder.com/150', estado: 'AMIGOS', origen: 'CURRENT',
          creador: currentUser?._id || 'abc123', color: '#FF8C42',
        },
      ]);
      setFollowingCalendars([
        {
          id: '3', nombre: 'Fitness Plan', descripcion: 'Workout routines',
          portada: 'https://via.placeholder.com/150', estado: 'PUBLICO', origen: 'CURRENT',
          creador: 'otherUser', color: '#42A5F5',
        },
      ]);
    }
  }, [userId, isMe, currentUser]);

  const handleEditProfile = () => {
    if (!currentUser) return;
    router.push('/profileEdit');
  };


  // Si no es mi perfil, delegamos a PublicProfile pasándole el userId que recibimos por parámetro
  if (!isMe && userId) {
    return <PublicProfile targetUserId={userId} />;
  }

  // Si SOY YO, seguimos hacia abajo y pintamos "Mi Perfil"
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
            </View>
          </View>

          <View style={styles.bioSection}>
            <Text style={styles.bio}>{shownUser._bio}</Text>
          </View>

          {/* Como siempre soy yo, solo pintamos el botón de Editar */}
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.postsGrid}>
          {/* Como siempre soy yo, pintamos mis calendarios y a los que sigo */}
          <Text style={styles.gridHeaderText}>My Calendars</Text>
          {myCalendars.map((cal) => (
            <CalendarCard
              key={cal.id}
              calendario={cal}
              //onPress={() => router.push(`/calendar/${cal.id}`)}
            />
          ))}

          <Text style={styles.gridHeaderText}>Following</Text>
          {followingCalendars.map((cal) => (
            <CalendarCard
              key={cal.id}
              calendario={cal}
              //onPress={() => router.push(`/calendar/${cal.id}`)}
            />
          ))}
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