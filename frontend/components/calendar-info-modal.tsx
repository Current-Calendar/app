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
  Pressable,
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
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [userToRemove, setUserToRemove] = useState<any>(null);

  const [localCalendar, setLocalCalendar] = useState<Calendar | null>(calendar);

  useEffect(() => {
    setLocalCalendar(calendar);
    setShowDeleteConfirm(false);
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
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || !localCalendar) return;

    try {
      await Promise.resolve(onDelete(localCalendar));
    } catch (error) {
      console.error('Delete calendar error:', error);
    } finally {
      setShowDeleteConfirm(false);
    }
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

const handleRemoveUser = async (userToRemove: any, userType: 'co-owner' | 'viewer') => {
  if (!localCalendar || !isOwner) return;

  setRemovingUserId(userToRemove.id);

  try {
    const endpoint = userType === 'co-owner'
      ? '/co_owners/'
      : '/viewers/';

    const currentUsers = userType === 'co-owner'
      ? (localCalendar.co_owners ?? [])
      : (localCalendar.viewers ?? []);

    const updatedUsers = currentUsers.filter((u: any) => u.id !== userToRemove.id);
    const userIds = updatedUsers.map((u: any) => u.id);

    const response = await apiClient.patch(`/calendars/${localCalendar.id}${endpoint}`, {
      [userType === 'co-owner' ? 'co_owners' : 'viewers']: userIds,
    });

    handleCalendarUpdated(response);
    Alert.alert('Success', `@${userToRemove.username} has been removed from the calendar.`);
  } catch (error: any) {
    console.error('Error removing user:', error);
    Alert.alert('Error', error?.message || 'Failed to remove user. Please try again.');
  } finally {
    setRemovingUserId(null);
    setUserToRemove(null);
  }
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

        {Array.isArray(localCalendar.categories) && localCalendar.categories.length > 0 && (
        <View style={calendarInfoModalStyles.metaRow}>
          <Ionicons name="pricetags-outline" size={16} color="#10464d" />
          <View style={calendarInfoModalStyles.tagsWrap}>
            {localCalendar.categories.map((category) => (
              <View
                key={String(category.id)}
                style={calendarInfoModalStyles.tagChip}
              >
                <Text style={calendarInfoModalStyles.tagChipText}>
                  {category.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
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

        {isOwner && (
          <>
            {(localCalendar.co_owners?.length ?? 0) > 0 || (localCalendar.viewers?.length ?? 0) > 0 ? (
              <View style={calendarInfoModalStyles.sharingSection}>
                <Text style={calendarInfoModalStyles.sharingSectionTitle}>Shared with</Text>

                {(localCalendar.co_owners ?? []).length > 0 && (
                  <View>
                    <Text style={calendarInfoModalStyles.permissionCategoryTitle}>Co-Owners</Text>
                    {(localCalendar.co_owners ?? []).map((coOwner: any, index: number) => (
                      <View key={`coowner-${index}`} style={calendarInfoModalStyles.shareItem}>
                        <View style={calendarInfoModalStyles.shareItemContent}>
                          <Ionicons name="person-circle-outline" size={24} color={accent} />
                          <View style={calendarInfoModalStyles.shareItemInfo}>
                            <Text style={calendarInfoModalStyles.shareItemName}>{coOwner.name || coOwner.username}</Text>
                            <Text style={calendarInfoModalStyles.shareItemUsername}>@{coOwner.username}</Text>
                          </View>
                        </View>
                        <View style={calendarInfoModalStyles.shareItemActions}>
                          <View style={calendarInfoModalStyles.permissionBadge}>
                            <Text style={calendarInfoModalStyles.permissionBadgeText}>Editor</Text>
                          </View>
                          {isOwner && (
                            <Pressable
                              style={[
                                calendarInfoModalStyles.removeUserButton,
                                removingUserId === coOwner.id && calendarInfoModalStyles.removeUserButtonDisabled,
                              ]}
                              onPress={() => setUserToRemove({ ...coOwner, type: 'co-owner' })}
                              disabled={removingUserId === coOwner.id}
                            >
                              {removingUserId === coOwner.id ? (
                                <ActivityIndicator size="small" color="#B33F37" />
                              ) : (
                                <Ionicons name="close" size={16} color="#B33F37" />
                              )}
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {(localCalendar.viewers ?? []).length > 0 && (
                  <View>
                    <Text style={calendarInfoModalStyles.permissionCategoryTitle}>Viewers</Text>
                    {(localCalendar.viewers ?? []).map((viewer: any, index: number) => (
                      <View key={`viewer-${index}`} style={calendarInfoModalStyles.shareItem}>
                        <View style={calendarInfoModalStyles.shareItemContent}>
                          <Ionicons name="person-circle-outline" size={24} color="#888" />
                          <View style={calendarInfoModalStyles.shareItemInfo}>
                            <Text style={calendarInfoModalStyles.shareItemName}>{viewer.name || viewer.username}</Text>
                            <Text style={calendarInfoModalStyles.shareItemUsername}>@{viewer.username}</Text>
                          </View>
                        </View>
                        <View style={calendarInfoModalStyles.shareItemActions}>
                          <View style={[calendarInfoModalStyles.permissionBadge, calendarInfoModalStyles.permissionBadgeViewer]}>
                            <Text style={[calendarInfoModalStyles.permissionBadgeText, calendarInfoModalStyles.permissionBadgeViewerText]}>Viewer</Text>
                          </View>
                          {isOwner && (
                            <Pressable
                              style={[
                                calendarInfoModalStyles.removeUserButton,
                                removingUserId === viewer.id && calendarInfoModalStyles.removeUserButtonDisabled,
                              ]}
                              onPress={() => setUserToRemove({ ...viewer, type: 'viewer' })}
                              disabled={removingUserId === viewer.id}
                            >
                              {removingUserId === viewer.id ? (
                                <ActivityIndicator size="small" color="#B33F37" />
                              ) : (
                                <Ionicons name="close" size={16} color="#B33F37" />
                              )}
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Text style={calendarInfoModalStyles.noSharingText}>Not shared with anyone</Text>
            )}
          </>
        )}

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

          {isOwner && (
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

      <ConfirmDeleteModal
        visible={showDeleteConfirm}
        title="Delete calendar"
        message={`Are you sure you want to delete "${localCalendar.name}"? This action cannot be undone.`}
        loading={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />

      <ConfirmDeleteModal
        visible={!!userToRemove}
        title={`Remove @${userToRemove?.username}`}
        message={`Are you sure you want to remove @${userToRemove?.username} from "${localCalendar.name}"?`}
        confirmLabel="Remove"
        loading={removingUserId === userToRemove?.id}
        onCancel={() => setUserToRemove(null)}
        onConfirm={() => {
          if (userToRemove) {
            void handleRemoveUser(userToRemove, userToRemove.type);
          }
        }}
      />
    </>
  );
}
