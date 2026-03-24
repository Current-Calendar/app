import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarCardStyles } from '@/styles/calendar-styles';
import { DefaultCalendarCover } from '@/components/default-calendar-cover';

// ---------- Types ----------
export interface CalendarData {
  id: string | number;
  name: string;
  description?: string;
  cover?: string;
  privacy?: 'FRIENDS' | 'PUBLIC' | 'PRIVATE' | string;
  likes_count?: number;
  liked_by_me?: boolean;
}

interface CalendarCardProps {
  calendar: CalendarData;
  onPress?: () => void;
  onComment?: (id: string) => void;
  onLike?: (id: string) => void;
}

export default function CalendarCard({
  calendar,
  onPress,
  onComment,
  onLike,
}: CalendarCardProps) {
  if (!calendar) return null;

  const liked = calendar.liked_by_me ?? false;
  const likesCount = calendar.likes_count ?? 0;

  return (
    <TouchableOpacity
      style={calendarCardStyles.cardContainer}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={calendarCardStyles.cardContent}>
        {calendar.cover && calendar.cover.trim() !== '' ? (
          <Image
            source={{ uri: calendar.cover }}
            style={calendarCardStyles.cardImage}
          />
        ) : (
          <DefaultCalendarCover
            style={calendarCardStyles.cardImage}
            label="Calendario"
          />
        )}

        <View style={calendarCardStyles.cardDetails}>
          <View style={calendarCardStyles.titleRow}>
            <Text style={calendarCardStyles.cardTitle} numberOfLines={1}>
              {calendar.name}
            </Text>

            {calendar.privacy === 'FRIENDS' && (
              <Ionicons
                name="star"
                size={18}
                color="#A0D842"
                style={calendarCardStyles.friendStar}
              />
            )}
          </View>

          <Text style={calendarCardStyles.cardDesc} numberOfLines={3}>
            {calendar.description || 'No description available.'}
          </Text>

          <View style={calendarCardStyles.actionsRow}>
            <TouchableOpacity
              onPress={() => onLike?.(String(calendar.id))}
              style={calendarCardStyles.actionButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={18}
                color={liked ? '#eb8c85' : '#10464d'}
              />
              {likesCount > 0 && (
                <Text style={calendarCardStyles.actionText}>{likesCount}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onComment?.(String(calendar.id))}
              style={calendarCardStyles.actionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#10464d" />
              <Text style={calendarCardStyles.actionText}>Comment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}