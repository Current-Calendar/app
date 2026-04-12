import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotifications, Notification } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notification-item';
import { notificationsPageStyles as s } from '@/styles/notification-styles';

const INVITE_TYPES = new Set(['CALENDAR_INVITE', 'EVENT_INVITE']);

export default function NotificationsScreen() {
  const { notifications, markAllAsRead, markAsRead, handleInvite } = useNotifications();
  const router = useRouter();

  useEffect(() => {
    return () => { markAllAsRead(); };
  }, []);

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
          <NotificationItem
            item={item}
            onPress={handleNotificationPress}
            onInviteAction={handleInvite}
          />
        )}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}