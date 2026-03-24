import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '@/hooks/use-notifications';
import { notificationItemStyles as s } from '@/styles/notification-styles';

const TYPE_ICON: Record<Notification['type'], { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  NEW_FOLLOWER: { name: 'person-add', color: '#1b5b60' },
  CALENDAR_FOLLOW: { name: 'calendar', color: '#1b5b60' },
  EVENT_SAVED: { name: 'bookmark', color: '#1b5b60' },
  EVENT_LIKED: { name: 'heart', color: '#e53935' },
  EVENT_COMMENT: { name: 'chatbubble', color: '#10464d' },
  CALENDAR_INVITE: { name: 'mail', color: '#10191a' },
  EVENT_INVITE: { name: 'mail', color: '#10191a' },
};

function getInitials(name?: string | null) {
  if (!name) return '?';

  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diff < 60) return 'Now';
  if (diff < 3600) return `Received ${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `Received ${Math.floor(diff / 3600)} h ago`;
  return `Received ${Math.floor(diff / 86400)} d ago`;
}

type Props = {
  item: Notification;
  onPress: (id: number) => void;
};

export function NotificationItem({ item, onPress }: Props) {
  const icon = TYPE_ICON[item.type];

  const actorName = 'User';

  return (
    <TouchableOpacity
      style={[s.row, !item.is_read && s.rowUnread]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={s.avatarWrap}>
        <View style={s.avatar}>
          <Text style={s.avatarInitials}>{getInitials(actorName)}</Text>
        </View>

        <View style={[s.typeIcon, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color="#fff" />
        </View>
      </View>

      <View style={s.body}>
        <Text style={s.message}>{item.message}</Text>
        <Text style={s.time}>{formatTime(item.created_at)}</Text>
      </View>

      {!item.is_read && <View style={s.unreadDot} />}
    </TouchableOpacity>
  );
}