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

  // Debounced search while typing
  useEffect(() => {
    // Solo buscamos si hay al menos 3 caracteres
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
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Function to send the invitation
  const handleInvite = async (userId: string | number) => {
    setInvitingUserId(userId);
    try {
      const endpoint = type === 'calendar'
        ? API_CONFIG.endpoints.inviteCalendar(itemId)
        : API_CONFIG.endpoints.inviteEvent(itemId);

      await apiClient.post(endpoint.replace(API_CONFIG.BaseURL, ''), { user: userId });
      Alert.alert('Sent!', 'Invitation sent successfully.');
    } catch (error) {
      const message = error instanceof ApiError && typeof (error.data as any)?.error === 'string'
        ? (error.data as any).error
        : 'Could not send the invitation right now.';
      Alert.alert('Error', message);
    } finally {
      setInvitingUserId(null);
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
        onPress={() => handleInvite(item.id)}
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
  inviteButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});

export default InviteUserModal;
