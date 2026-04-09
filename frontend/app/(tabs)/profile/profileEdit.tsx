import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User } from '../../../types/auth';
import { useAuth } from '@/hooks/use-auth';
import * as ImagePicker from 'expo-image-picker';
import { useProfileActions } from '@/hooks/use-profile-actions';
import { API_CONFIG } from '@/constants/api';
import apiClient, { appendPhoto } from '@/services/api-client';
import profileStyles from '../../../styles/profile-styles';

const EditProfileScreen = () => {
  const router = useRouter();
  const { user: currentUser, setUser: updateUserContext, logout } = useAuth();
  const { updateOwnProfile, deleteOwnProfile: deleteOwnProfileRequest } = useProfileActions();
 
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
          pronouns,
          bio,
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
      const fallbackMessage =
        'If an account exists with this email, a password reset link has been sent.';
      const genericErrorMessage = 'Could not send recovery email. Please try again.';
      const response = await fetch(API_CONFIG.endpoints.recoverPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, source: window.location.origin }),
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;
      if (!response.ok) throw new Error(genericErrorMessage);
      setShowRecoverConfirm(false);
      Alert.alert('Success', data?.message ?? fallbackMessage);
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
    <SafeAreaView style={profileStyles.container}>
 
      <View style={profileStyles.editHeaderGreen}>
        <View style={profileStyles.editHeaderRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={profileStyles.editHeaderButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={profileStyles.editHeaderTitle}>Edit profile</Text>
          <View style={{ width: 60 }} />
        </View>
      </View>
      <View style={profileStyles.editHeaderCoral} />
 
      <ScrollView style={profileStyles.scrollView} contentContainerStyle={profileStyles.editScrollContent}>
 
        <View style={profileStyles.editPhotoSection}>
          <TouchableOpacity onPress={handleChangePhoto} style={profileStyles.editProfilePictureContainer}>
            <Image
              source={photo ? { uri: photo } : require('../../../assets/images/default-user.jpg')}
              style={profileStyles.profilePicture}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleChangePhoto}>
            <Text style={profileStyles.editChangePhotoText}>Change profile photo</Text>
          </TouchableOpacity>
        </View>
 
        <View style={profileStyles.editSectionPill}>
          <View style={profileStyles.editFieldContainer}>
            <Text style={profileStyles.editLabel}>Pronouns</Text>
            <TextInput
              style={profileStyles.editInput}
              value={pronouns}
              onChangeText={setPronouns}
              placeholder="e.g., she/her, he/him, they/them"
              placeholderTextColor="#aaa"
            />
          </View>
          <View style={[profileStyles.editFieldContainer, { marginBottom: 0 }]}>
            <Text style={profileStyles.editLabel}>Bio</Text>
            <TextInput
              style={[profileStyles.editInput, profileStyles.editBioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={profileStyles.editCharacterCount}>{bio.length} characters</Text>
          </View>
        </View>
 
        <TouchableOpacity
          style={profileStyles.editSaveButton}
          onPress={handleSave}
          disabled={isDeletingProfile}
          activeOpacity={0.8}
        >
          <Text style={profileStyles.editSaveButtonText}>Save changes</Text>
        </TouchableOpacity>
 
        <View style={profileStyles.editDangerPill}>
          <Text style={profileStyles.editDangerTitle}>Danger zone</Text>
          <Text style={profileStyles.editDangerText}>
            These actions may have permanent impact on your account.
          </Text>
 
          <TouchableOpacity
            style={[profileStyles.editDangerButton, isRecoveringPassword && profileStyles.editButtonDisabled]}
            onPress={() => { setRecoverError(null); setShowRecoverConfirm(true); }}
            disabled={isRecoveringPassword}
            activeOpacity={0.8}
          >
            {isRecoveringPassword ? (
              <ActivityIndicator size="small" color="#B33F37" />
            ) : (
              <Text style={profileStyles.editDangerButtonText}>Recover password</Text>
            )}
          </TouchableOpacity>
          {recoverError ? <Text style={profileStyles.editDangerErrorText}>{recoverError}</Text> : null}
 
          <TouchableOpacity
            style={[profileStyles.editDangerButton, { marginBottom: 0 }, isDeletingProfile && profileStyles.editButtonDisabled]}
            onPress={() => { setDeleteError(null); setShowDeleteConfirm(true); }}
            disabled={isDeletingProfile}
            activeOpacity={0.8}
          >
            {isDeletingProfile ? (
              <ActivityIndicator size="small" color="#B33F37" />
            ) : (
              <Text style={profileStyles.editDangerButtonText}>Delete profile</Text>
            )}
          </TouchableOpacity>
          {deleteError ? <Text style={profileStyles.editDangerErrorText}>{deleteError}</Text> : null}
        </View>
 
      </ScrollView>
 
      <Modal
        visible={showRecoverConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!isRecoveringPassword) setShowRecoverConfirm(false); }}
      >
        <Pressable
          style={profileStyles.editModalOverlay}
          onPress={() => { if (!isRecoveringPassword) setShowRecoverConfirm(false); }}
        >
          <Pressable style={profileStyles.editModalCard} onPress={() => {}}>
            <Text style={profileStyles.editModalTitle}>Recover password</Text>
            <Text style={profileStyles.editModalText}>
              {`A password recovery email will be sent to ${currentUser?.email}. Do you want to continue?`}
            </Text>
            <View style={profileStyles.editModalActions}>
              <TouchableOpacity
                style={profileStyles.editModalCancelButton}
                onPress={() => setShowRecoverConfirm(false)}
                disabled={isRecoveringPassword}
              >
                <Text style={profileStyles.editModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[profileStyles.editModalConfirmButton, isRecoveringPassword && profileStyles.editButtonDisabled]}
                onPress={() => { void recoverPassword(); }}
                disabled={isRecoveringPassword}
              >
                {isRecoveringPassword ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={profileStyles.editModalConfirmButtonText}>Send</Text>
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
        onRequestClose={() => { if (!isDeletingProfile) setShowDeleteConfirm(false); }}
      >
        <Pressable
          style={profileStyles.editModalOverlay}
          onPress={() => { if (!isDeletingProfile) setShowDeleteConfirm(false); }}
        >
          <Pressable style={profileStyles.editModalCard} onPress={() => {}}>
            <Text style={profileStyles.editModalTitle}>Delete profile</Text>
            <Text style={profileStyles.editModalText}>
              Are you sure you want to delete your profile? This action cannot be undone.
            </Text>
            <View style={profileStyles.editModalActions}>
              <TouchableOpacity
                style={profileStyles.editModalCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeletingProfile}
              >
                <Text style={profileStyles.editModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[profileStyles.editModalDeleteButton, isDeletingProfile && profileStyles.editButtonDisabled]}
                onPress={() => { void deleteOwnProfile(); }}
                disabled={isDeletingProfile}
              >
                {isDeletingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={profileStyles.editModalDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
 
    </SafeAreaView>
  );
};
 
export default EditProfileScreen;
