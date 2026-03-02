import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User } from '../../../types/user';
import { Calendar } from '../../../types/calendar';
import { useAuth } from '../../../context/authContext'; 
import CalendarCard from '../../../components/calendar-card';
import profileStyles from './profileStyles';

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
            </View>
          </View>

          <View style={profileStyles.bioSection}>
            <Text style={profileStyles.bio}>{shownUser._bio}</Text>
          </View>

          {/* Como siempre soy yo, solo pintamos el botón de Editar */}
          <TouchableOpacity style={profileStyles.actionButton} onPress={handleEditProfile}>
            <Text style={profileStyles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={profileStyles.postsGrid}>
          {/* Como siempre soy yo, pintamos mis calendarios y a los que sigo */}
          <Text style={profileStyles.gridHeaderText}>My Calendars</Text>
          {myCalendars.map((cal) => (
            <CalendarCard
              key={cal.id}
              calendario={cal}
              //onPress={() => router.push(`/calendar/${cal.id}`)}
            />
          ))}

          <Text style={profileStyles.gridHeaderText}>Following</Text>
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

export default ProfileScreen;