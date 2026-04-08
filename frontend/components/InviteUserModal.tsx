import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient, { ApiError } from '@/services/api-client';
import { API_CONFIG } from '@/constants/api';

// Tipos de datos esperados del backend
export type UserSearchResult = {
  id: string | number;
  username: string;
  photo?: string; // Photo if backend provides it
};

interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  type: 'calendar' | 'event';
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ visible, onClose, itemId, type }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | number | null>(null);

  const [selectedUserForCalendar, setSelectedUserForCalendar] = useState<string | number | null>(null);
  const [privilegeModalVisible, setPrivilegeModalVisible] = useState(false);
  const [selectedPrivilege, setSelectedPrivilege] = useState<'VIEW' | 'EDIT'>('VIEW');

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("Warning");

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await apiClient.get<UserSearchResult[] | { data: UserSearchResult[] }>(`/users/search/?search=${encodeURIComponent(searchQuery)}`);
        
        const data = Array.isArray(response) ? response : (response as any)?.data || [];
        setResults(data);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleInviteClick = (userId: string | number) => {
    if (type === 'calendar') {
      setSelectedUserForCalendar(userId);
      setSelectedPrivilege('VIEW');
      setPrivilegeModalVisible(true);
    } else {
      handleInvite(userId);
    }
  };

  const handleInvite = async (userId: string | number, privilege?: 'VIEW' | 'EDIT') => {
    setInvitingUserId(userId);
    try {
      const endpoint = type === 'calendar'
        ? `/calendars/${itemId}/invite/`
        : `/events/${itemId}/invite/`;

      const body = privilege ? { user: userId, permission: privilege } : { user: userId };
      await apiClient.post(endpoint, body);
      Alert.alert('Sent!', 'Invitation sent successfully.');
    } catch (error: any) {
      const message = error instanceof ApiError && typeof (error.data as any)?.error === 'string'
        ? (error.data as any).error
        : error.response?.data?.message || error.response?.data?.error || error.message || 'Could not send the invitation right now.';
      
      const isForbidden = error?.response?.status === 403 || error?.status === 403 || (error instanceof ApiError && error.status === 403);
      const title = isForbidden ? "Free Plan Limit" : "Warning";

      if (Platform.OS !== "web") {
        Alert.alert(title, message);
      } else {
        setErrorTitle(title);
        setErrorMessage(message);
        setErrorModalVisible(true);
      }
    } finally {
      setInvitingUserId(null);
    }
  };

  const confirmCalendarInvite = () => {
    if (selectedUserForCalendar) {
      handleInvite(selectedUserForCalendar, selectedPrivilege);
      setPrivilegeModalVisible(false);
      setSelectedUserForCalendar(null);
    }
  };


  // Renderizado de cada usuario en la lista
  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.avatarPlaceholder} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.inviteButton,
          invitingUserId === item.id && styles.inviteButtonDisabled
        ]}
        onPress={() => handleInviteClick(item.id)}
        disabled={invitingUserId === item.id}
      >
        {invitingUserId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.inviteButtonText}>Invite</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {type === 'calendar' ? 'Invite to calendar' : 'Invite to event'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search a user by username..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Results area */}
          {isSearching ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#164E52" />
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderUserItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : searchQuery.trim().length >= 3 ? (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          ) : (
            <View style={styles.centerContent}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Type at least 3 letters to search</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal
      visible={privilegeModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setPrivilegeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Privileges</Text>
          <Text style={styles.modalMessage}>Select the permission level for this user:</Text>
          
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioOption} 
              onPress={() => setSelectedPrivilege('VIEW')}
            >
              <View style={[styles.radioCircle, selectedPrivilege === 'VIEW' && styles.radioCircleSelected]} />
              <Text style={styles.radioText}>View</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.radioOption} 
              onPress={() => setSelectedPrivilege('EDIT')}
            >
              <View style={[styles.radioCircle, selectedPrivilege === 'EDIT' && styles.radioCircleSelected]} />
              <Text style={styles.radioText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setPrivilegeModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, {color: '#131111'}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={confirmCalendarInvite}
            >
              <Text style={styles.modalButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <Modal
      visible={errorModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setErrorModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.errorModalTitle}>{errorTitle}</Text>
          <Text style={styles.modalMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.errorModalButton}
            onPress={() => setErrorModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%', // Ocupa el 75% de la pantalla (estilo Bottom Sheet)
    padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  closeButton: { padding: 4 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6',
    borderRadius: 10, paddingHorizontal: 12, marginBottom: 20, height: 44
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 15, marginTop: 12, textAlign: 'center' },
  userRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F0F1',
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  avatarText: { color: '#164E52', fontSize: 16, fontWeight: 'bold' },
  username: { fontSize: 16, color: '#333', fontWeight: '500' },
  inviteButton: { backgroundColor: '#164E52', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  inviteButtonDisabled: { backgroundColor: '#A0BCC0' },
  inviteButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  // Custom Modals styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%', maxWidth: 400, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  errorModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#E53935', marginBottom: 8 },
  modalMessage: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  modalButton: { backgroundColor: '#164E52', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, flex: 1, marginHorizontal: 4, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#E5E7EB' },
  errorModalButton: { backgroundColor: '#E53935', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  radioGroup: { width: '100%', marginBottom: 10 },
  radioOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  radioCircle: { height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: '#164E52', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  radioCircleSelected: { backgroundColor: '#164E52' },
  radioText: { fontSize: 16, color: '#333' }
});

export default InviteUserModal;
