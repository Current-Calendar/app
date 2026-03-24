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
}

interface CalendarCardProps {
  calendar: CalendarData;
  onPress?: () => void;
  onComment?: (id: string) => void;
}

export default function CalendarCard({
  calendar,
  onPress,
  onComment,
}: CalendarCardProps) {
  if (!calendar) return null;

  return (
    <TouchableOpacity
      style={calendarCardStyles.cardContainer}
      onPress={onPress}
      activeOpacity={0.8}
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

          <TouchableOpacity
            onPress={() => onComment?.(String(calendar.id))}
            style={calendarCardStyles.commentButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#10464d" />
            <Text style={calendarCardStyles.commentText}>Comment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}