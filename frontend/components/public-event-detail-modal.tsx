import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '@/types/calendar';
import { publicEventDetailModalStyles } from '@/styles/calendar-styles';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';

interface PublicEventDetailModalProps {
    event: CalendarEvent | null;
    onClose: () => void;
}

export function PublicEventDetailModal({ event, onClose }: PublicEventDetailModalProps) {
    if (!event) return null;

    const accent = event.color ?? '#10464d';

    return (
        <BottomSheetModal visible={!!event} onClose={onClose}>
            <View style={publicEventDetailModalStyles.titleRow}>
                <View style={[publicEventDetailModalStyles.accentBar, { backgroundColor: accent }]} />
                <View style={publicEventDetailModalStyles.titleContent}>
                    <Text style={publicEventDetailModalStyles.title}>{event.titulo}</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                    <Ionicons name="close-circle" size={26} color="#bbb" />
                </TouchableOpacity>
            </View>

            {event.descripcion ? (
                <Text style={publicEventDetailModalStyles.description}>{event.descripcion}</Text>
            ) : null}

            <View style={publicEventDetailModalStyles.detailsContainer}>
                <DetailRow icon="calendar-outline" label={formatDate(event.fecha)} />
                <DetailRow icon="time-outline" label={event.hora} />

                {event.nombre_lugar ? (
                    <DetailRow icon="location-outline" label={event.nombre_lugar} />
                ) : null}

                {event.ubicacion && (
                    <DetailRow
                        icon="navigate-outline"
                        label={`${event.ubicacion.latitude.toFixed(4)}, ${event.ubicacion.longitude.toFixed(4)}`}
                    />
                )}

                {event.recurrencia && (
                    <DetailRow icon="repeat-outline" label={event.recurrencia} />
                )}
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
        <View style={publicEventDetailModalStyles.detailRow}>
            <Ionicons name={icon} size={17} color="#888" />
            <Text style={publicEventDetailModalStyles.detailLabel}>{label}</Text>
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

