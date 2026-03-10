import React from 'react';
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

const PRIVACY_LABELS: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
    PRIVADO: { label: 'Private', icon: 'lock-closed-outline' },
    AMIGOS: { label: 'Friends', icon: 'people-outline' },
    PUBLICO: { label: 'Public', icon: 'globe-outline' },
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
    isDeleting?: boolean;
}

export function CalendarInfoModal({
    calendar,
    onClose,
    onDelete,
    onEdit,
    isDeleting = false,
}: CalendarInfoModalProps) {
    if (!calendar) return null;

    const accent = calendar.color;
    const privacy = PRIVACY_LABELS[calendar.estado] ?? PRIVACY_LABELS.PRIVADO;
    const origin = ORIGIN_LABELS[calendar.origen] ?? ORIGIN_LABELS.CURRENT;

    const handleDeletePress = () => {
        if (!onDelete) return;

        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to delete "${calendar.nombre}"? This action cannot be undone.`)) {
                void onDelete(calendar);
            }
            return;
        }

        Alert.alert(
            'Delete calendar',
            `Are you sure you want to delete "${calendar.nombre}"? This action cannot be undone.`,
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
        <BottomSheetModal visible={!!calendar} onClose={onClose}>
            <View style={calendarInfoModalStyles.header}>
                <View style={[calendarInfoModalStyles.colorBadge, { backgroundColor: accent }]} />
                <View style={calendarInfoModalStyles.headerContent}>
                    <Text style={calendarInfoModalStyles.title}>{calendar.nombre}</Text>
                    <Text style={calendarInfoModalStyles.creatorText}>by @{calendar.creador}</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                    <Ionicons name="close-circle" size={26} color="#bbb" />
                </TouchableOpacity>
            </View>

            {calendar.portada ? (
                <Image
                    source={{ uri: calendar.portada }}
                    style={calendarInfoModalStyles.coverImage}
                    resizeMode="cover"
                />
            ) : null}

            {calendar.descripcion ? (
                <Text style={calendarInfoModalStyles.description}>{calendar.descripcion}</Text>
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
                <TouchableOpacity
                    style={calendarInfoModalStyles.editButton}
                    onPress={() => onEdit?.(calendar)}
                    activeOpacity={0.75}
                >
                    <Ionicons name="pencil" size={16} color="#fff" />
                    <Text style={calendarInfoModalStyles.editButtonLabel}>Edit calendar</Text>
                </TouchableOpacity>

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
        </BottomSheetModal>
    );
}

