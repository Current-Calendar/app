import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from '@/types/calendar';
import { calendarInfoModalStyles } from '@/styles/calendar-styles';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { useAuth } from '@/hooks/use-auth';
import InviteUserModal from '@/components/InviteUserModal';
import { ShareCalendarModal } from '@/components/share-calendar-modal';
import { DefaultCalendarCover } from '@/components/default-calendar-cover';
import { AddCoOwnerModal } from '@/components/add-co-owner';

const PRIVACY_LABELS: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  PRIVATE: { label: 'Private', icon: 'lock-closed-outline' },
  FRIENDS: { label: 'Friends', icon: 'people-outline' },
  PUBLIC: { label: 'Public', icon: 'globe-outline' },
};

const ORIGIN_LABELS: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  CURRENT: { label: 'Current', icon: 'calendar-outline' },
  GOOGLE: { label: 'Google Calendar', icon: 'logo-google' },
  APPLE: { label: 'Apple Calendar', icon: 'logo-apple' },
};

interface CalendarInfoModalProps {
  calendar: Calendar | null;
  onClose: () => void;
  onDelete?: (calendar: Calendar) => Promise<void> | void;
  onEdit?: (calendar: Calendar) => void;
  onShare?: (calendar: Calendar) => void;
  onCalendarUpdated?: (calendar: any) => void;
  isDeleting?: boolean;
}

export function CalendarInfoModal({
  calendar,
  onClose,
  onDelete,
  onEdit,
  onCalendarUpdated,
  isDeleting = false,
}: CalendarInfoModalProps) {
    const { user } = useAuth();
    const [inviteVisible, setInviteVisible] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showCoOwners, setShowCoOwners] = useState(false);

  const [localCalendar, setLocalCalendar] = useState<Calendar | null>(calendar);

  useEffect(() => {
    setLocalCalendar(calendar);
  }, [calendar]);

 
  if (!localCalendar) return null;


  const accent = localCalendar.color;
  const privacy = PRIVACY_LABELS[localCalendar.privacy] ?? PRIVACY_LABELS.PRIVATE;
  const origin = ORIGIN_LABELS[localCalendar.origin] ?? ORIGIN_LABELS.CURRENT;
  const isOwner = user && localCalendar.creator === user.username;
  const hasCalendarCover =
        typeof localCalendar.cover === 'string' && localCalendar.cover.trim().length > 0;


  const handleDeletePress = () => {
    if (!onDelete) return;

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${localCalendar.name}"? This action cannot be undone.`)) {
        void onDelete(localCalendar);
      }
      return;
    }

    Alert.alert(
      'Delete calendar',
      `Are you sure you want to delete "${localCalendar.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void onDelete(localCalendar),
        },
      ]
    );
  };

  const handleCalendarUpdated = (updatedCalendar: any) => {
  const merged = {
    ...localCalendar,
    ...updatedCalendar,
    creator: updatedCalendar?.creator ?? localCalendar.creator,
    creator_id: updatedCalendar?.creator_id ?? (localCalendar as any).creator_id,
    creator_username:
      updatedCalendar?.creator_username ?? (localCalendar as any).creator_username,
    co_owners: Array.isArray(updatedCalendar?.co_owners)
      ? updatedCalendar.co_owners
      : ((localCalendar as any).co_owners ?? []),
  } as Calendar;

  setLocalCalendar(merged);
  onCalendarUpdated?.(merged);
};

  return (
    <>
      <BottomSheetModal visible={!!localCalendar} onClose={onClose}>
        <View style={calendarInfoModalStyles.header}>
          <View style={[calendarInfoModalStyles.colorBadge, { backgroundColor: accent }]} />
          <View style={calendarInfoModalStyles.headerContent}>
            <Text style={calendarInfoModalStyles.title}>{localCalendar.name}</Text>
            <Text style={calendarInfoModalStyles.creatorText}>by @{localCalendar.creator}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close-circle" size={26} color="#bbb" />
          </TouchableOpacity>
        </View>

      {hasCalendarCover ? (
                <Image
                    source={{ uri: localCalendar.cover.trim() }}
                    style={calendarInfoModalStyles.coverImage}
                    resizeMode="cover"
                />
            ) : (
                <DefaultCalendarCover
                    style={calendarInfoModalStyles.coverImage}
                    label="Calendario"
                    iconSize={42}
                />
            )}
        {localCalendar.description ? (
          <Text style={calendarInfoModalStyles.description}>{localCalendar.description}</Text>
        ) : null}

        <View style={calendarInfoModalStyles.infoGrid}>
          <View style={[calendarInfoModalStyles.infoCard, { borderLeftColor: accent }]}>
            <Ionicons name={privacy.icon} size={18} color={accent} />
            <View>
              <Text style={calendarInfoModalStyles.infoLabel}>Privacy</Text>
              <Text style={calendarInfoModalStyles.infoValue}>{privacy.label}</Text>
            </View>
          </View>
          <View style={[calendarInfoModalStyles.infoCard, { borderLeftColor: accent }]}>
            <Ionicons name={origin.icon} size={18} color={accent} />
            <View>
              <Text style={calendarInfoModalStyles.infoLabel}>Source</Text>
              <Text style={calendarInfoModalStyles.infoValue}>{origin.label}</Text>
            </View>
          </View>
        </View>

        <View style={calendarInfoModalStyles.actions}>
             {isOwner && (
                        <TouchableOpacity
                            style={calendarInfoModalStyles.inviteButton}
                            onPress={() => setInviteVisible(true)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="person-add-outline" size={16} color="#10464d" />
                            <Text
                                style={calendarInfoModalStyles.inviteButtonLabel}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                Invite to calendar
                            </Text>
                        </TouchableOpacity>
                    )}
          <TouchableOpacity
            style={calendarInfoModalStyles.editButton}
            onPress={() => onEdit?.(localCalendar)}
            activeOpacity={0.75}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
            <Text style={calendarInfoModalStyles.editButtonLabel}>Edit calendar</Text>
          </TouchableOpacity>
                    {isOwner && (
                        <TouchableOpacity
                            style={calendarInfoModalStyles.shareButton}
                            onPress={() => setShowCoOwners(true)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="person-add-outline" size={16} color="#10464d" />
                            <Text style={calendarInfoModalStyles.shareButtonLabel}>Add co-owner</Text>
                        </TouchableOpacity>
                    )}

          {localCalendar.privacy !== 'PRIVATE' && (
            <TouchableOpacity
              style={calendarInfoModalStyles.shareButton}
              onPress={() => setShowShare(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="share-social-outline" size={16} color="#10464d" />
              <Text style={calendarInfoModalStyles.shareButtonLabel}>Share</Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={[calendarInfoModalStyles.deleteButton, isDeleting && calendarInfoModalStyles.deleteButtonDisabled]}
              onPress={handleDeletePress}
              disabled={isDeleting}
              activeOpacity={0.75}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#B33F37" />
              ) : (
                <Ionicons name="trash-outline" size={16} color="#B33F37" />
              )}
              <Text style={calendarInfoModalStyles.deleteButtonLabel}>
                {isDeleting ? 'Deleting...' : 'Delete calendar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ShareCalendarModal
          calendar={showShare ? localCalendar : null}
          onClose={() => setShowShare(false)}
        />
      </BottomSheetModal>

      <AddCoOwnerModal
        calendar={showCoOwners ? localCalendar : null}
        onClose={() => setShowCoOwners(false)}
        onCalendarUpdated={handleCalendarUpdated}
      />

            {isOwner && (
                <InviteUserModal
                    visible={inviteVisible}
                    onClose={() => setInviteVisible(false)}
                    itemId={String(localCalendar.id)}
                    type="calendar"
                />
            )}
    </>
  );
}
