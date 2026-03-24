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
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User } from '../../types/auth';
import { useAuth } from "@/hooks/use-auth";
import * as ImagePicker from 'expo-image-picker';
import { useProfileActions } from '@/hooks/use-profile-actions';
import { API_CONFIG } from '@/constants/api';
import apiClient, { appendPhoto } from '@/services/api-client';


const EditProfileScreen = () => {
  const router = useRouter();
  const { user: currentUser, setUser: updateUserContext, logout } = useAuth();
  const { updateOwnProfile, deleteOwnProfile: deleteOwnProfileRequest } = useProfileActions();


  // State for form fields - initialize with params from navigation
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [pronouns, setPronouns] = useState<string>(currentUser?.pronouns || '');
  const [bio, setBio] = useState<string>(currentUser?.bio || '');
  const [photo, setPhoto] = useState<string>(currentUser?.photo || '');
  const [newPhotoAsset, setNewPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [showRecoverConfirm, setShowRecoverConfirm] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);

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
      const asset = pickerResult.assets[0];
      setNewPhotoAsset(asset);
      setPhoto(asset.uri);
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
      let responseUser: User;

      if (newPhotoAsset) {
        const formData = new FormData();
        formData.append('pronouns', pronouns);
        formData.append('bio', bio);
        await appendPhoto(formData, newPhotoAsset);
        const result = await apiClient.put<{ message: string; user: User }>('/users/me/edit/', formData);
        responseUser = result.user;
      } else {
        const result = await apiClient.put<{ message: string; user: User }>('/users/me/edit/', {
          pronouns: pronouns,
          bio: bio,
        });
        responseUser = result.user;
      }

      updateUserContext({
        ...currentUser,
        pronouns: responseUser.pronouns ?? pronouns,
        bio: responseUser.bio ?? bio,
        photo: responseUser.photo ?? currentUser.photo,
      });

      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Could not save profile. Please try again.');
    }
  };

  const recoverPassword = async () => {
    if (!currentUser?.email) {
      setRecoverError('No email associated with your account.');
      return;
    }

    setIsRecoveringPassword(true);
    setRecoverError(null);
    try {
      const response = await fetch(API_CONFIG.endpoints.recoverPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, source: window.location.origin }),
      });
      if (!response.ok) {
        throw new Error('Failed to send password recovery email.');
      }
      setShowRecoverConfirm(false);
      Alert.alert('Success', 'Password recovery email sent. Check your inbox.');
    } catch (error) {
      setRecoverError(error instanceof Error ? error.message : 'Could not send recovery email. Please try again.');
    } finally {
      setIsRecoveringPassword(false);
    }
  };

  const deleteOwnProfile = async () => {
    if (!currentUser) {
      setDeleteError('You must be logged in to delete your profile.');
      return;
    }

    setIsDeletingProfile(true);
    setDeleteError(null);
    try {
      await deleteOwnProfileRequest();

      setShowDeleteConfirm(false);
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error deleting profile:', error);
      setDeleteError(error instanceof Error ? error.message : 'Could not delete your profile. Please try again.');
    } finally {
      setIsDeletingProfile(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {router.back()}}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={isDeletingProfile}>
          <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.photoSection}>
          <Image source={photo ? { uri: photo } : require('../../assets/images/default-user.jpg')} style={styles.profilePicture} 
          /> 
          <TouchableOpacity style={styles.changePhotoButton} onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
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

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger zone</Text>
          <Text style={styles.dangerText}>
            These actions may have permanent impact on your account.
          </Text>
          <TouchableOpacity
            style={[styles.recoverPasswordButton, isRecoveringPassword && styles.recoverPasswordButtonDisabled]}
            onPress={() => {
              setRecoverError(null);
              setShowRecoverConfirm(true);
            }}
            disabled={isRecoveringPassword}
            activeOpacity={0.8}
          >
            {isRecoveringPassword ? (
              <ActivityIndicator size="small" color="#EAF7F6" />
            ) : (
              <Text style={styles.recoverPasswordButtonText}>Recover Password</Text>
            )}
          </TouchableOpacity>
          {recoverError ? <Text style={styles.recoverErrorText}>{recoverError}</Text> : null}

          <TouchableOpacity
            style={[styles.deleteProfileButton, isDeletingProfile && styles.deleteProfileButtonDisabled]}
            onPress={() => {
              setDeleteError(null);
              setShowDeleteConfirm(true);
            }}
            disabled={isDeletingProfile}
            activeOpacity={0.8}
          >
            {isDeletingProfile ? (
              <ActivityIndicator size="small" color="#B33F37" />
            ) : (
              <Text style={styles.deleteProfileButtonText}>Delete Profile</Text>
            )}
          </TouchableOpacity>
          {deleteError ? <Text style={styles.deleteErrorText}>{deleteError}</Text> : null}
        </View>

      </ScrollView>

      <Modal
        visible={showRecoverConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isRecoveringPassword) {
            setShowRecoverConfirm(false);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isRecoveringPassword) {
              setShowRecoverConfirm(false);
            }
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Recover password</Text>
            <Text style={styles.modalText}>
              A password recovery email will be sent to {currentUser?.email}. Do you want to continue?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRecoverConfirm(false)}
                disabled={isRecoveringPassword}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, isRecoveringPassword && styles.recoverPasswordButtonDisabled]}
                onPress={() => {
                  void recoverPassword();
                }}
                disabled={isRecoveringPassword}
              >
                {isRecoveringPassword ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeletingProfile) {
            setShowDeleteConfirm(false);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isDeletingProfile) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Delete profile</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete your profile? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeletingProfile}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteButton, isDeletingProfile && styles.deleteProfileButtonDisabled]}
                onPress={() => {
                  void deleteOwnProfile();
                }}
                disabled={isDeletingProfile}
              >
                {isDeletingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  dangerSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1d7d4',
    backgroundColor: '#fff6f5',
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#842f2a',
    marginBottom: 6,
  },
  dangerText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7a4f4a',
    marginBottom: 12,
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
  recoverPasswordButton: {
    borderWidth: 1.5,
    borderColor: '#eb8c85',
    backgroundColor: '#eb8c8514',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginBottom: 10,
  },
  recoverPasswordButtonDisabled: {
    opacity: 0.7,
  },
  recoverPasswordButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B33F37',
  },
  recoverErrorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#B33F37',
    textAlign: 'center',
  },
  deleteProfileButton: {
    borderWidth: 1.5,
    borderColor: '#eb8c85',
    backgroundColor: '#eb8c8514',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  deleteProfileButtonDisabled: {
    opacity: 0.7,
  },
  deleteProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B33F37',
  },
  deleteErrorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#B33F37',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000050',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: '#FFFDED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eadfc0',
    padding: 18,
    width: '80%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#4d4d4d',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3a3a3a',
  },
  modalDeleteButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B33F37',
  },
  modalDeleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B33F37',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default EditProfileScreen;
