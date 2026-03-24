import { View, Text, Image, StyleSheet } from 'react-native';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { API_CONFIG } from '@/constants/api';

interface Props {
  message: ChatMessageType;
  isOwn: boolean;
}

function resolvePhoto(photo?: string): string | null {
  if (!photo) return null;
  if (/^https?:\/\//.test(photo)) return photo;
  const base = API_CONFIG.rootBaseURL || API_CONFIG.BaseURL;
  return `${base.replace(/\/+$/, '')}/${photo.replace(/^\/+/, '')}`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessage({ message, isOwn }: Props) {
  const photoUrl = resolvePhoto(message.sender_photo);

  return (
    <View style={[styles.row, isOwn && styles.rowReverse]}>
      {!isOwn && (
        photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {message.sender_username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )
      )}

      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && (
          <Text style={styles.username}>{message.sender_username}</Text>
        )}
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.text}</Text>
        <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatTime(message.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ddd',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10464D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: '#10464D',
    borderBottomRightRadius: 4,
  },
  username: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10464D',
    marginBottom: 2,
  },
  text: {
    fontSize: 15,
    color: '#11181C',
  },
  textOwn: {
    color: '#fff',
  },
  time: {
    fontSize: 11,
    color: '#687076',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
});
