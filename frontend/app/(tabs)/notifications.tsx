import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, SectionList, Alert, Platform, Modal, StyleSheet } from 'react-native';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notification-item';
import { notificationsPageStyles as s } from '@/styles/notification-styles';
import { ApiError } from '@/services/api-client';
import { useFocusEffect } from 'expo-router';

const INVITE_TYPES = new Set(['CALENDAR_INVITE', 'EVENT_INVITE']);
const COOKIE_PREFERENCE_KEY = 'current_cookie_preference';
const COOKIE_PREFERENCE_COOKIE = 'current_cookie_preference';
type CookiePreference = 'accepted' | 'rejected';

function readCookiePreferenceFromCookie(): CookiePreference | null {
  if (Platform.OS !== 'web') return null;

  try {
    const pair = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${COOKIE_PREFERENCE_COOKIE}=`));
    if (!pair) return null;
    const rawValue = decodeURIComponent(pair.split('=').slice(1).join('='));
    return rawValue === 'accepted' || rawValue === 'rejected' ? rawValue : null;
  } catch {
    return null;
  }
}

export default function NotificationsScreen() {
  const { notifications, markAllAsRead, markAsRead, handleInvite } = useNotifications();
  const [cookiePreference, setCookiePreference] = useState<CookiePreference | null>(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("Warning");

  const readCookiePreference = React.useCallback(() => {
    if (Platform.OS !== 'web') return;

    try {
      const saved = window.localStorage.getItem(COOKIE_PREFERENCE_KEY);
      if (!saved) {
        setCookiePreference(readCookiePreferenceFromCookie());
        return;
      }

      if (saved === 'accepted' || saved === 'rejected') {
        setCookiePreference(saved);
        return;
      }

      const parsed = JSON.parse(saved) as {
        value?: CookiePreference;
        expiresAt?: string;
      };
      const isValidValue = parsed?.value === 'accepted' || parsed?.value === 'rejected';
      const expiryMs = parsed?.expiresAt ? new Date(parsed.expiresAt).getTime() : NaN;
      const isExpired = Number.isNaN(expiryMs) || expiryMs <= Date.now();

      if (!isValidValue || isExpired) {
        setCookiePreference(readCookiePreferenceFromCookie());
        return;
      }

      setCookiePreference(parsed.value);
    } catch {
      setCookiePreference(readCookiePreferenceFromCookie());
    }
  }, []);

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

  useEffect(() => {
    readCookiePreference();
    if (Platform.OS !== 'web') return;

    const onCookiePreferenceChanged = () => {
      readCookiePreference();
    };
    window.addEventListener('current:cookiePreferenceChanged', onCookiePreferenceChanged);

    return () => {
      window.removeEventListener('current:cookiePreferenceChanged', onCookiePreferenceChanged);
    };
  }, [readCookiePreference]);

  useFocusEffect(
    React.useCallback(() => {
      readCookiePreference();
    }, [readCookiePreference]),
  );

  const invitations = notifications.filter(n => INVITE_TYPES.has(n.type));
  const regular = notifications.filter(n => !INVITE_TYPES.has(n.type));
  const isLimitedMode = Platform.OS === 'web' && cookiePreference === 'rejected';

  const visibleNotifications = isLimitedMode ? invitations : notifications;
  const visibleInvitations = visibleNotifications.filter(n => INVITE_TYPES.has(n.type));
  const visibleRegular = visibleNotifications.filter(n => !INVITE_TYPES.has(n.type));
  const hasUnread = visibleNotifications.some(n => !n.is_read);

  const sections = [
    ...(visibleInvitations.length ? [{ title: 'Invitations', data: visibleInvitations }] : []),
    ...(visibleRegular.length ? [{ title: 'Notifications', data: visibleRegular }] : []),
  ];

  if (visibleNotifications.length === 0) {
    return (
      <View style={[s.container, s.emptyState]}>
        <Text style={s.emptyText} testID="notifications-empty-text">
          {isLimitedMode ? 'No essential notifications' : 'No notifications'}
        </Text>
        {isLimitedMode && (
          <Text style={styles.limitedHint}>
            Optional notifications are hidden while optional cookies are rejected.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={s.container}>
      {isLimitedMode && (
        <View style={styles.limitedBanner}>
          <Text style={styles.limitedBannerTitle}>Limited notifications mode</Text>
          <Text style={styles.limitedBannerBody}>
            Only essential invitation notifications are shown.
          </Text>
        </View>
      )}
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
  limitedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0c88b',
    backgroundColor: '#fff2dd',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  limitedBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7a4d00',
    marginBottom: 2,
  },
  limitedBannerBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6a4706',
  },
  limitedHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#6a4706',
    maxWidth: 320,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%', maxWidth: 400, alignItems: 'center' },
  errorModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#E53935', marginBottom: 8 },
  modalMessage: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 20 },
  errorModalButton: { backgroundColor: '#E53935', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});