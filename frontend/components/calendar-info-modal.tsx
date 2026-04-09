import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Image,
  useWindowDimensions,
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
import apiClient from '@/services/api-client';

const PRIVACY_LABELS: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  PRIVATE: { label: 'Private', icon: 'lock-closed-outline' },
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
  const { width } = useWindowDimensions();
  const isCompactActions = width < 540;
  const actionIconSize = isCompactActions ? 22 : 16;
  const { user } = useAuth();
  const [inviteVisible, setInviteVisible] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCoOwners, setShowCoOwners] = useState(false);
  const [isLeavingCalendar, setIsLeavingCalendar] = useState(false);

  const [localCalendar, setLocalCalendar] = useState<Calendar | null>(calendar);

  useEffect(() => {
    setLocalCalendar(calendar);
  }, [calendar]);

 
  if (!localCalendar) return null;


  const accent = localCalendar.color;
  const privacy = PRIVACY_LABELS[localCalendar.privacy] ?? PRIVACY_LABELS.PRIVATE;
  const origin = ORIGIN_LABELS[localCalendar.origin] ?? ORIGIN_LABELS.CURRENT;
  const currentUsername = (user?.username ?? '').trim().toLowerCase();
  const isOwner = user?.username === localCalendar.creator;
  const isCoOwner =
    user &&
    !isOwner &&
    (localCalendar.co_owners ?? []).some(
      (co: any) => (co?.username ?? '').trim().toLowerCase() === currentUsername
    );
  const isViewerOnly =
    user &&
    !isOwner &&
    !isCoOwner &&
    (localCalendar.viewers ?? []).some(
      (viewer: any) => (viewer?.username ?? '').trim().toLowerCase() === currentUsername
    );
  const canLeaveCalendar = isCoOwner || isViewerOnly;
  const isOwnerOrCoOwner =
    user &&
    (
      localCalendar.creator === user.username ||
      (localCalendar.co_owners ?? []).some(
        (co: any) => co.username === user.username
      )
    );
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

  const handleLeaveCalendarPress = async () => {
    if (!localCalendar) return;

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to leave "${localCalendar.name}"? You will lose access to this calendar.`)) {
        await leaveCalendar();
      }
      return;
    }

    Alert.alert(
      'Leave calendar',
      `Are you sure you want to leave "${localCalendar.name}"? You will lose access to this calendar.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => void leaveCalendar(),
        },
      ]
    );
  };

  const leaveCalendar = async () => {
    if (!localCalendar) return;

    try {
      setIsLeavingCalendar(true);
      await apiClient.post(`/calendars/${localCalendar.id}/leave/`);
      
      // Success - close the modal and notify parent
      Alert.alert('Success', `You have left the calendar "${localCalendar.name}".`);
      onClose?.();
      onCalendarUpdated?.({ id: localCalendar.id, left: true });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to leave the calendar. Please try again.');
    } finally {
      setIsLeavingCalendar(false);
    }
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
    viewers: Array.isArray(updatedCalendar?.viewers)
      ? updatedCalendar.viewers
      : ((localCalendar as any).viewers ?? []),
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
              source={{ uri: String(localCalendar.cover).trim() }}
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

        <View
          style={[
            calendarInfoModalStyles.actions,
            isCompactActions && calendarInfoModalStyles.actionsCompact,
          ]}
        >
          {isOwnerOrCoOwner && (
            isCompactActions ? (
              <View style={calendarInfoModalStyles.compactActionWrap}>
                <TouchableOpacity
                  style={[
                    calendarInfoModalStyles.compactActionButton,
                    calendarInfoModalStyles.compactActionButtonInvite,
                  ]}
                  onPress={() => setInviteVisible(true)}
                  activeOpacity={0.75}
                  accessibilityLabel="Invite to calendar"
                >
                  <Ionicons name="person-add-outline" size={actionIconSize} color="#10464d" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={calendarInfoModalStyles.inviteButton}
                onPress={() => setInviteVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="person-add-outline" size={actionIconSize} color="#10464d" />
                <Text
                  style={calendarInfoModalStyles.inviteButtonLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Invite to calendar
                </Text>
              </TouchableOpacity>
            )
          )}

          {isOwnerOrCoOwner && (
            isCompactActions ? (
              <View style={calendarInfoModalStyles.compactActionWrap}>
                <TouchableOpacity
                  style={[
                    calendarInfoModalStyles.compactActionButton,
                    calendarInfoModalStyles.compactActionButtonEdit,
                  ]}
                  onPress={() => onEdit?.(localCalendar)}
                  activeOpacity={0.75}
                  accessibilityLabel="Edit calendar"
                >
                  <Ionicons name="pencil" size={actionIconSize} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={calendarInfoModalStyles.editButton}
                onPress={() => onEdit?.(localCalendar)}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil" size={actionIconSize} color="#fff" />
                <Text style={calendarInfoModalStyles.editButtonLabel}>Edit calendar</Text>
              </TouchableOpacity>
            )
          )}

          {localCalendar.privacy !== 'PRIVATE' && (
            isCompactActions ? (
              <View style={calendarInfoModalStyles.compactActionWrap}>
                <TouchableOpacity
                  style={[
                    calendarInfoModalStyles.compactActionButton,
                    calendarInfoModalStyles.compactActionButtonNeutral,
                  ]}
                  onPress={() => setShowShare(true)}
                  activeOpacity={0.75}
                  accessibilityLabel="Share calendar"
                >
                  <Ionicons name="share-social-outline" size={actionIconSize} color="#10464d" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={calendarInfoModalStyles.shareButton}
                onPress={() => setShowShare(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="share-social-outline" size={actionIconSize} color="#10464d" />
                <Text style={calendarInfoModalStyles.shareButtonLabel}>Share</Text>
              </TouchableOpacity>
            )
          )}

          {isOwner && onDelete && (
            isCompactActions ? (
              <View style={calendarInfoModalStyles.compactActionWrap}>
                <TouchableOpacity
                  style={[
                    calendarInfoModalStyles.compactActionButton,
                    calendarInfoModalStyles.compactActionButtonDanger,
                    isDeleting && calendarInfoModalStyles.deleteButtonDisabled,
                  ]}
                  onPress={handleDeletePress}
                  disabled={isDeleting}
                  activeOpacity={0.75}
                  accessibilityLabel="Delete calendar"
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#B33F37" />
                  ) : (
                    <Ionicons name="trash-outline" size={actionIconSize} color="#B33F37" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  calendarInfoModalStyles.deleteButton,
                  isDeleting && calendarInfoModalStyles.deleteButtonDisabled,
                ]}
                onPress={handleDeletePress}
                disabled={isDeleting}
                activeOpacity={0.75}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#B33F37" />
                ) : (
                  <Ionicons name="trash-outline" size={actionIconSize} color="#B33F37" />
                )}
                <Text style={calendarInfoModalStyles.deleteButtonLabel}>
                  {isDeleting ? 'Deleting...' : 'Delete calendar'}
                </Text>
              </TouchableOpacity>
            )
          )}

          {canLeaveCalendar && (
            isCompactActions ? (
              <View style={calendarInfoModalStyles.compactActionWrap}>
                <TouchableOpacity
                  style={[
                    calendarInfoModalStyles.compactActionButton,
                    calendarInfoModalStyles.compactActionButtonDanger,
                    isLeavingCalendar && calendarInfoModalStyles.deleteButtonDisabled,
                  ]}
                  onPress={handleLeaveCalendarPress}
                  disabled={isLeavingCalendar}
                  activeOpacity={0.75}
                  accessibilityLabel="Leave calendar"
                >
                  {isLeavingCalendar ? (
                    <ActivityIndicator size="small" color="#B33F37" />
                  ) : (
                    <Ionicons name="exit-outline" size={actionIconSize} color="#B33F37" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  calendarInfoModalStyles.deleteButton,
                  isLeavingCalendar && calendarInfoModalStyles.deleteButtonDisabled,
                ]}
                onPress={handleLeaveCalendarPress}
                disabled={isLeavingCalendar}
                activeOpacity={0.75}
              >
                {isLeavingCalendar ? (
                  <ActivityIndicator size="small" color="#B33F37" />
                ) : (
                  <Ionicons name="exit-outline" size={actionIconSize} color="#B33F37" />
                )}
                <Text style={calendarInfoModalStyles.deleteButtonLabel}>
                  {isLeavingCalendar ? 'Leaving...' : 'Leave calendar'}
                </Text>
              </TouchableOpacity>
            )
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

            {isOwnerOrCoOwner && (
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
