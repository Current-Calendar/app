import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User } from '../../types/user';
import { useAuth } from '@/context/authContext';
import * as ImagePicker from 'expo-image-picker';


const EditProfileScreen = () => {
  const router = useRouter();
  const { user: currentUser, setUser: updateUserContext } = useAuth();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL; // e.g., "https://api.example.com"


  // State for form fields - initialize with params from navigation
  const [firstName, setFirstName] = useState<string>(currentUser?._firstName || '');
  const [lastName, setLastName] = useState<string>(currentUser?._lastName || '');
  const [pronouns, setPronouns] = useState<string>(currentUser?._pronouns || '');
  const [bio, setBio] = useState<string>(currentUser?._bio || '');
  const [photo, setPhoto] = useState<string>(currentUser?._photo || '');

  const handleChangePhoto = async () => {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Permission to access media library is required!');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!pickerResult.canceled) {
      // TODO: Upload the selected image to your server and get the URL, then setPhoto(uploadedUrl);
      setPhoto(pickerResult.assets[0].uri);
    }
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Could not pick image. Please try again.');
  }
};

 const handleSave = async () => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'No user is currently logged in.');
        return;
      }
      const updatedUser: User = {
        ...currentUser, // keep all unchanged fields
        _firstName: firstName,
        _lastName: lastName,
        _pronouns: pronouns,
        _bio: bio,
        _photo: photo,
      };

      const response = await fetch(`${apiUrl}/users/me/${currentUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // optionally: 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          _firstName: firstName,
          _lastName: lastName,
          _pronouns: pronouns,
          _bio: bio,
          _photo: photo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data: User = await response.json();

      updateUserContext(data);

      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Could not save profile. Please try again.');
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {router.back()}}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.photoSection}>
          <Image source={photo ? { uri: photo } : require('../../assets/images/default-user.jpg')} style={styles.profilePicture} // TODO: change manually imported pic 
          /> 
          <TouchableOpacity style={styles.changePhotoButton} onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <View style={{...styles.fieldContainer, flexDirection: 'row'}}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                placeholderTextColor="#999"
              />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                placeholderTextColor="#999"
              />
            </View>
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Pronouns</Text>
            <TextInput
              style={styles.input}
              value={pronouns}
              onChangeText={setPronouns}
              placeholder="e.g., she/her, he/him, they/them"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{bio.length} characters</Text>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  headerButton: {
    fontSize: 16,
    color: '#262626',
  },
  saveButton: {
    color: '#eb8c85',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#dbdbdb',
    marginBottom: 12,
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#eb8c85',
  },
  formSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#262626',
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
    textAlign: 'right',
  },
  helperText: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
    fontStyle: 'italic',
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default EditProfileScreen;