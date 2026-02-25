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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface User {
  name: string;
  bio: string;
  pronouns: string;
  photo: string;
  followers: number;
}

const EditProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name: string;
    bio: string;
    pronouns: string;
    photo: string;
    followers: string;
  }>();

  // State for form fields - initialize with params from navigation
  const [name, setName] = useState<string>(params.name || '');
  const [pronouns, setPronouns] = useState<string>(params.pronouns || '');
  const [bio, setBio] = useState<string>(params.bio || '');
  const [photo, setPhoto] = useState<string>(params.photo || '');

  const handleChangePhoto = () => {
    // placeholder for image picker functionality, we'll use expo-image-picker (i guess?)
    // e.g.: import * as ImagePicker from 'expo-image-picker';
    // TODO: implement image picker 
  };

  const handleSave = () => {
    // placeholder for save functionality
    // TODO: implement API call to save updated user data
    const updatedUser: User = {
      name,
      pronouns,
      bio,
      photo,
      followers: Number(params.followers) || 0,
    };
    console.log('Saving user data:', updatedUser);
    router.back();
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
          <Image source={require('../../assets/images/icon.png')} style={styles.profilePicture} // TODO: change manually imported pic 
          /> 
          <TouchableOpacity style={styles.changePhotoButton} onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#999"
            />
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