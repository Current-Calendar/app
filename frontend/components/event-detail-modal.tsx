import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '@/types/calendar';
import { useRouter } from 'expo-router';
import { useEventActions } from '@/hooks/use-event-actions';
import { eventDetailModalStyles } from '@/styles/calendar-styles';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';

interface EventDetailModalProps {
    event: CalendarEvent | null;
    onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
    const router = useRouter();
    const { deleteEvent } = useEventActions();

    if (!event) return null;

    const accent = event.color ?? '#10464d';

    const handleDeleteEvent = async (eventId: string) => {
        try {
            await deleteEvent(eventId);
            onClose();
            router.replace('/calendars');
        }
        catch (error) {
            console.log('Error deleting event:', error);
        }
    };

    return (
        <BottomSheetModal visible={!!event} onClose={onClose}>
            <View style={eventDetailModalStyles.titleRow}>
                <View style={[eventDetailModalStyles.accentBar, { backgroundColor: accent }]} />
                <View style={eventDetailModalStyles.titleContent}>
                    <Text style={eventDetailModalStyles.title}>{event.title}</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                    <Ionicons name="close-circle" size={26} color="#bbb" />
                </TouchableOpacity>
            </View>

            {event.description ? (
                <Text style={eventDetailModalStyles.description}>{event.description}</Text>
            ) : null}

            <View style={eventDetailModalStyles.detailsContainer}>
                <DetailRow icon="calendar-outline" label={formatDate(event.date)} />
                <DetailRow icon="time-outline" label={event.time} />

                {event.place_name ? (
                    <DetailRow icon="location-outline" label={event.place_name} />
                ) : null}

                {event.location && (
                    <DetailRow
                        icon="navigate-outline"
                        label={`${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`}
                    />
                )}

                {event.recurrence && (
                    <DetailRow icon="repeat-outline" label={event.recurrence} />
                )}
            </View>

            <View style={eventDetailModalStyles.actions}>
                <TouchableOpacity
                    style={eventDetailModalStyles.editButton}
                    activeOpacity={0.7}
                    onPress={() => {
                        onClose();
                        router.push({ pathname: '/events/edit_events', params: { id: event.id } });
                    }}
                >
                    <Ionicons name="pencil" size={16} color="#fff" />
                    <Text style={eventDetailModalStyles.editButtonLabel}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={eventDetailModalStyles.deleteButton}
                    activeOpacity={0.7}
                    onPress={() => handleDeleteEvent(event.id)}
                >
                    <Ionicons name="trash-outline" size={16} color="#eb8c85" />
                    <Text style={eventDetailModalStyles.deleteButtonLabel}>Delete</Text>
                </TouchableOpacity>
            </View>
        </BottomSheetModal>
    );
}

function DetailRow({
    icon,
    label,
}: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
}) {
    return (
        <View style={eventDetailModalStyles.detailRow}>
            <Ionicons name={icon} size={17} color="#888" />
            <Text style={eventDetailModalStyles.detailLabel}>{label}</Text>
        </View>
    );
}

function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

