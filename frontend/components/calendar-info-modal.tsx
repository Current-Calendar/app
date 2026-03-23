import React, { useState, useEffect } from 'react';
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
import { ShareCalendarModal } from '@/components/share-calendar-modal';
import { AddCoOwnerModal } from '@/components/add-co-owner';
import { useEventLabels } from '@/hooks/use-event-labels';
import { LabelChip } from '@/components/label-chip';
import { LabelManagerModal } from '@/components/label-manager-modal';

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
    isDeleting?: boolean;
}

export function CalendarInfoModal({
    calendar,
    onClose,
    onDelete,
    onEdit,
    isDeleting = false,
}: CalendarInfoModalProps) {
    const [showShare, setShowShare] = useState(false);
    const [showCoOwners, setShowCoOwners] = useState(false);
    const {
        labels,
        addLabelToCalendar,
        removeLabelFromCalendar,
        addCustomLabel,
        removeCustomLabel,
        colorPalette,
    } = useEventLabels();
    const [localLabels, setLocalLabels] = useState(calendar?.labels ?? []);
    const [labelManagerVisible, setLabelManagerVisible] = useState(false);

    useEffect(() => {
        setLocalLabels(calendar?.labels ?? []);
    }, [calendar]);

    if (!calendar) return null;

    const accent = calendar.color;
    const privacy = PRIVACY_LABELS[calendar.privacy] ?? PRIVACY_LABELS.PRIVATE;
    const origin = ORIGIN_LABELS[calendar.origin] ?? ORIGIN_LABELS.CURRENT;

    const handleDeletePress = () => {
        if (!onDelete) return;

        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to delete "${calendar.name}"? This action cannot be undone.`)) {
                void onDelete(calendar);
            }
            return;
        }

        Alert.alert(
            'Delete calendar',
            `Are you sure you want to delete "${calendar.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => void onDelete(calendar),
                },
            ]
        );
    };

    return (
        <>
            <BottomSheetModal visible={!!calendar} onClose={onClose}>
                <View style={calendarInfoModalStyles.header}>
                    <View style={[calendarInfoModalStyles.colorBadge, { backgroundColor: accent }]} />
                    <View style={calendarInfoModalStyles.headerContent}>
                        <Text style={calendarInfoModalStyles.title}>{calendar.name}</Text>
                        <Text style={calendarInfoModalStyles.creatorText}>by @{calendar.creator}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <Ionicons name="close-circle" size={26} color="#bbb" />
                    </TouchableOpacity>
                </View>

                {calendar.cover ? (
                    <Image
                        source={{ uri: calendar.cover }}
                        style={calendarInfoModalStyles.coverImage}
                        resizeMode="cover"
                    />
                ) : null}

                {calendar.description ? (
                    <Text style={calendarInfoModalStyles.description}>{calendar.description}</Text>
                ) : null}

                <View style={calendarInfoModalStyles.labelsBlock}>
                    <View style={calendarInfoModalStyles.labelsHeader}>
                        <Text style={calendarInfoModalStyles.infoLabel}>Labels</Text>
                        <TouchableOpacity
                            style={calendarInfoModalStyles.manageBtn}
                            onPress={() => setLabelManagerVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle-outline" size={16} color="#10464d" />
                            <Text style={calendarInfoModalStyles.manageText}>New</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={calendarInfoModalStyles.labelsChips}>
                        {labels.map((label) => {
                            const selected = localLabels.some((l) => String(l.id) === String(label.id));
                            return (
                                <LabelChip
                                    key={label.id}
                                    label={label}
                                    selected={selected}
                                    compact
                                    onPress={() => {
                                        const id = String(label.id);
                                        if (selected) {
                                            removeLabelFromCalendar(calendar.id, id);
                                            setLocalLabels((prev) => prev.filter((l) => String(l.id) !== id));
                                        } else {
                                            addLabelToCalendar(calendar.id, id);
                                            setLocalLabels((prev) => [...prev, label]);
                                        }
                                    }}
                                />
                            );
                        })}
                        {labels.length === 0 && (
                            <Text style={calendarInfoModalStyles.helperText}>No labels yet.</Text>
                        )}
                    </View>
                </View>

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
                    <TouchableOpacity
                        style={calendarInfoModalStyles.editButton}
                        onPress={() => onEdit?.(calendar)}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="pencil" size={16} color="#fff" />
                        <Text style={calendarInfoModalStyles.editButtonLabel}>Edit calendar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={calendarInfoModalStyles.shareButton}
                        onPress={() => setShowCoOwners(true)}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="person-add-outline" size={16} color="#10464d" />
                        <Text style={calendarInfoModalStyles.shareButtonLabel}>Add co-owner</Text>
                    </TouchableOpacity>

                    {calendar.privacy !== 'PRIVATE' && (
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
                    calendar={showShare ? calendar : null}
                    onClose={() => setShowShare(false)}
                />
            </BottomSheetModal>

            <AddCoOwnerModal
                calendar={showCoOwners ? calendar : null}
                onClose={() => setShowCoOwners(false)}
            />

            <LabelManagerModal
                visible={labelManagerVisible}
                labels={labels}
                customLabels={labels.filter((l) => !l.is_default && !l.isDefault)}
                palette={colorPalette}
                onCreate={(name, color) => addCustomLabel(name, color, { type: 'calendar', id: calendar.id })}
                onDelete={(id) => removeCustomLabel(id, { type: 'calendar', id: calendar.id })}
                onClose={() => setLabelManagerVisible(false)}
            />
        </>
    );
}
