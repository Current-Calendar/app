import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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

const INVITE_TYPES = new Set<Notification['type']>(['CALENDAR_INVITE', 'EVENT_INVITE']);

type Props = {
  item: Notification;
  onPress: (id: number) => void;
  onInviteAction?: (id: number, action: 'accept' | 'decline') => Promise<void>;
};

export function NotificationItem({ item, onPress, onInviteAction }: Props) {
  const icon = TYPE_ICON[item.type];
  const [processing, setProcessing] = useState<'accept' | 'decline' | null>(null);
  const isInvite = INVITE_TYPES.has(item.type);

  const senderName = item.sender_username ?? null;
  const contextLabel =
    item.related_calendar_name
      ? item.related_calendar_name
      : item.related_event_title
      ? item.related_event_title
      : null;

  const handleInviteAction = async (action: 'accept' | 'decline') => {
    if (!onInviteAction || processing) return;
    setProcessing(action);
    try {
      await onInviteAction(item.id, action);
    } catch {
      // The parent component will handle the error display
    } finally {
      setProcessing(null);
    }
  };

  return (
    <TouchableOpacity
      style={[s.row, !item.is_read && s.rowUnread]}
      onPress={() => !isInvite && onPress(item.id)}
      activeOpacity={isInvite ? 1 : 0.7}
    >
      <View style={s.avatarWrap}>
        {item.sender_photo ? (
          <Image source={{ uri: item.sender_photo }} style={s.avatarImage} />
        ) : (
          <View style={s.avatar}>
            <Text style={s.avatarInitials}>{getInitials(senderName)}</Text>
          </View>
        )}
        <View style={[s.typeIcon, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color="#fff" />
        </View>
      </View>

      <View style={s.body}>
        {senderName && (
          <Text style={s.senderName}>@{senderName}</Text>
        )}
        <Text style={s.message}>{item.message}</Text>
        {contextLabel && (
          <View style={s.contextBox}>
            <Ionicons
              name={item.related_calendar_name ? 'calendar-outline' : 'ticket-outline'}
              size={12}
              color="#10464d"
            />
            <Text style={s.contextLabel} numberOfLines={1}>{contextLabel}</Text>
          </View>
        )}
        <Text style={s.time}>{formatTime(item.created_at)}</Text>

        {isInvite && onInviteAction && (
          <View style={s.inviteActions}>
            <TouchableOpacity
              style={[s.inviteBtn, s.inviteBtnDecline]}
              onPress={() => handleInviteAction('decline')}
              disabled={processing !== null}
            >
              <Text style={s.inviteBtnDeclineText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.inviteBtn, s.inviteBtnAccept]}
              onPress={() => handleInviteAction('accept')}
              disabled={processing !== null}
            >
              {processing === 'accept' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.inviteBtnAcceptText}>Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!item.is_read && !isInvite && <View style={s.unreadDot} />}
    </TouchableOpacity>
  );
}