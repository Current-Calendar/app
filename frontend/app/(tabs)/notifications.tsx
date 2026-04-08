import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, SectionList, Alert, Platform, Modal, StyleSheet } from 'react-native';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notification-item';
import { notificationsPageStyles as s } from '@/styles/notification-styles';
import { ApiError } from '@/services/api-client';

const INVITE_TYPES = new Set(['CALENDAR_INVITE', 'EVENT_INVITE']);

export default function NotificationsScreen() {
  const { notifications, markAllAsRead, markAsRead, handleInvite } = useNotifications();

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("Warning");

  const onInviteAction = async (id: number, action: 'accept' | 'decline') => {
    try {
      await handleInvite(id, action);
    } catch (error: any) {
      const message = error instanceof ApiError && typeof (error.data as any)?.error === 'string'
        ? (error.data as any).error
        : error.response?.data?.message || error.response?.data?.error || error.message || `Could not ${action} the invitation right now.`;
      
      const isForbidden = error?.response?.status === 403 || error?.status === 403 || (error instanceof ApiError && error.status === 403);
      const title = isForbidden ? "Free Plan Limit" : "Warning";
        setErrorTitle(title);
        setErrorMessage(message);
        setErrorModalVisible(true);
      throw error; // Rethrow to let NotificationItem stop its processing indicator
    }
  };

  useEffect(() => {
    return () => { markAllAsRead(); };
  }, []);

  const invitations = notifications.filter(n => INVITE_TYPES.has(n.type));
  const regular     = notifications.filter(n => !INVITE_TYPES.has(n.type));
  const hasUnread   = notifications.some(n => !n.is_read);

  const sections = [
    ...(invitations.length ? [{ title: 'Invitations', data: invitations }] : []),
    ...(regular.length     ? [{ title: 'Notifications', data: regular   }] : []),
  ];

  if (notifications.length === 0) {
    return (
      <View style={[s.container, s.emptyState]}>
        <Text style={s.emptyText}>No notifications</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {hasUnread && (
        <TouchableOpacity style={s.markReadBtn} onPress={markAllAsRead}>
          <Text style={s.markReadLabel}>Mark every notification as read</Text>
        </TouchableOpacity>
      )}
      <SectionList
        sections={sections}
        keyExtractor={item => String(item.id)}
        renderSectionHeader={({ section }) => (
          <Text style={s.sectionLabel}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={markAsRead} onInviteAction={onInviteAction} />
        )}
        stickySectionHeadersEnabled={false}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%', maxWidth: 400, alignItems: 'center' },
  errorModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#E53935', marginBottom: 8 },
  modalMessage: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 20 },
  errorModalButton: { backgroundColor: '#E53935', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});