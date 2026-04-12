import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SectionList, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationsContext } from '@/context/notification-context';
import { Notification } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notification-item';
import { notificationsPageStyles as s, notificationsModalStyles as ms } from '@/styles/notification-styles';
import { ApiError } from '@/services/api-client';

const INVITE_TYPES = new Set(['CALENDAR_INVITE', 'EVENT_INVITE']);

export default function NotificationsScreen() {
  const { notifications, markAllAsRead, markAsRead, handleInvite } = useNotificationsContext();
  const router = useRouter();
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Warning');

  useEffect(() => {
    return () => { markAllAsRead(); };
  }, []);

  const onInviteAction = async (id: number, action: 'accept' | 'decline') => {
    try {
      await handleInvite(id, action);
    } catch (error: any) {
      const message =
        error instanceof ApiError && typeof (error.data as any)?.error === 'string'
          ? (error.data as any).error
          : error.response?.data?.message || error.response?.data?.error || error.message || `Could not ${action} the invitation right now.`;
      const isForbidden =
        error?.response?.status === 403 ||
        error?.status === 403 ||
        (error instanceof ApiError && error.status === 403);
      setErrorTitle(isForbidden ? 'Free Plan Limit' : 'Warning');
      setErrorMessage(message);
      setErrorModalVisible(true);
      throw error;
    }
  };

  const handleNotificationPress = (item: Notification) => {
    markAsRead(item.id);

    switch (item.type) {
      case 'NEW_FOLLOWER':
        if (item.sender_username) {
          router.push({
            pathname: '/(tabs)/profile/[username]',
            params: { username: item.sender_username },
          });
        }
        break;

      case 'CALENDAR_FOLLOW':
      case 'CALENDAR_INVITE':
        if (item.related_calendar) {
          router.push({
            pathname: '/(tabs)/calendar-view',
            params: { calendarId: item.related_calendar },
          });
        }
        break;

      case 'EVENT_SAVED':
      case 'EVENT_LIKED':
      case 'EVENT_COMMENT':
      case 'EVENT_INVITE':
        if (item.related_event) {
          router.push({
            pathname: '/(tabs)/calendar-view',
            params: {
              calendarId: item.related_calendar ?? '',
              eventId: item.related_event,
            },
          });
        }
        break;
    }
  };

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
        <Text style={s.emptyText} testID="notifications-empty-text">No notifications</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity
          style={[s.markReadBtn, !hasUnread && s.markReadBtnHidden]}
          onPress={markAllAsRead}
          disabled={!hasUnread}
        >
          <Text style={s.markReadLabel}>Mark every notification as read</Text>
        </TouchableOpacity>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={item => String(item.id)}
        renderSectionHeader={({ section }) => (
          <Text style={s.sectionLabel}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={handleNotificationPress}
            onInviteAction={onInviteAction}
          />
        )}
        stickySectionHeadersEnabled={false}
      />

      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={ms.modalOverlay}>
          <View style={ms.modalContent}>
            <Text style={ms.errorModalTitle}>{errorTitle}</Text>
            <Text style={ms.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={ms.errorModalButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={ms.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}