import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/api-client';

// Tipos esperados del backend (ajusta según lo que devuelva tu API)
export type Invitation = {
  id: string | number;
  item_type: 'calendar' | 'event'; // Para saber si es calendario o evento
  item_id: string | number;
  item_name: string; // Nombre del calendario o evento
  sender: {
    username: string;
    photo?: string;
  };
  created_at?: string;
};

interface InvitationsModalProps {
  visible: boolean;
  onClose: () => void;
}

const InvitationsModal: React.FC<InvitationsModalProps> = ({ visible, onClose }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const fetchInvitations = async () => {
    try {
      // Llama a tu endpoint real de invitaciones pendientes
      const response = await apiClient.get<Invitation[] | { data: Invitation[] }>('/invitations/');
      const data = Array.isArray(response) ? response : (response as any)?.data || [];
      setInvitations(data);
    } catch (error) {
      console.error('Error cargando invitaciones:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      fetchInvitations().finally(() => setIsLoading(false));
    }
  }, [visible]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchInvitations();
    setIsRefreshing(false);
  };

  const handleAction = async (inviteId: string | number, action: 'accept' | 'reject') => {
    setProcessingId(inviteId);
    try {
      await apiClient.post(`/invitations/${inviteId}/${action}/`);
      
      // Quitamos la invitación de la lista tras responder
      setInvitations((prev) => prev.filter((inv) => inviteId !== inv.id));
      
      if (action === 'accept') {
        Alert.alert('¡Aceptada!', 'Te has unido correctamente.');
      }
    } catch (error) {
      Alert.alert('Error', `No se pudo ${action === 'accept' ? 'aceptar' : 'rechazar'} la invitación.`);
    } finally {
      setProcessingId(null);
    }
  };

  const renderInvitation = ({ item }: { item: Invitation }) => {
    const isProcessing = processingId === item.id;
    const iconName = item.item_type === 'calendar' ? 'calendar-outline' : 'ticket-outline';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.senderInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.sender.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.senderName}>@{item.sender.username}</Text>
              <Text style={styles.inviteContext}>te ha invitado a un {item.item_type}</Text>
            </View>
          </View>
        </View>

        <View style={styles.itemBox}>
          <Ionicons name={iconName} size={20} color="#10464D" />
          <Text style={styles.itemName}>{item.item_name}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnReject]}
            onPress={() => handleAction(item.id, 'reject')}
            disabled={isProcessing}
          >
            <Text style={styles.btnRejectText}>Rechazar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnAccept]}
            onPress={() => handleAction(item.id, 'accept')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnAcceptText}>Aceptar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tus Invitaciones</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#10464D" />
            </View>
          ) : invitations.length > 0 ? (
            <FlatList
              data={invitations}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderInvitation}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10464D" />
              }
            />
          ) : (
            <View style={styles.centerContent}>
              <Ionicons name="mail-open-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No tienes invitaciones pendientes.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#F7F6F2', // Fondo ligeramente gris/crema para contrastar tarjetas
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#10464D' },
  closeButton: { padding: 4 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 16, marginTop: 12, textAlign: 'center' },
  
  // Estilos de la tarjeta
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,70,77,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { marginBottom: 12 },
  senderInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF7F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#10464D', fontSize: 16, fontWeight: 'bold' },
  senderName: { fontSize: 15, fontWeight: '700', color: '#111' },
  inviteContext: { fontSize: 13, color: '#666', marginTop: 2 },
  itemBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4F4', padding: 10, borderRadius: 10, marginBottom: 16 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#10464D', marginLeft: 8, flexShrink: 1 },
  
  // Botones
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnReject: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EB8C85' },
  btnRejectText: { color: '#B33F37', fontWeight: '700', fontSize: 14 },
  btnAccept: { backgroundColor: '#10464D' },
  btnAcceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default InvitationsModal;