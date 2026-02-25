import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '@/types/calendar';

interface EventDetailModalProps {
    event: CalendarEvent | null;
    onClose: () => void;
}

/**
 * Bottom-sheet-style modal showing all event info from the Evento model.
 *
 * TODO BACKEND - Wire up "Edit" / "Delete" actions once API is ready.
 */
export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
    if (!event) return null;

    const accent = event.color ?? '#10464d';

    return (
        <Modal visible={!!event} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={() => { }}>
                    <View style={styles.handleBar} />

                    <View style={styles.titleRow}>
                        <View style={[styles.accentBar, { backgroundColor: accent }]} />
                        <View style={styles.titleContent}>
                            <Text style={styles.title}>{event.titulo}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <Ionicons name="close-circle" size={26} color="#bbb" />
                        </TouchableOpacity>
                    </View>

                    {event.descripcion ? (
                        <Text style={styles.description}>{event.descripcion}</Text>
                    ) : null}

                    {/* Info details */}
                    <View style={styles.detailsContainer}>
                        {/* Date */}
                        <DetailRow icon="calendar-outline" label={formatDate(event.fecha)} />

                        {/* Time */}
                        <DetailRow icon="time-outline" label={event.hora} />

                        {/* Place */}
                        {event.nombre_lugar ? (
                            <DetailRow icon="location-outline" label={event.nombre_lugar} />
                        ) : null}

                        {/* Coordinates */}
                        {event.ubicacion && (
                            <DetailRow
                                icon="navigate-outline"
                                label={`${event.ubicacion.latitude.toFixed(4)}, ${event.ubicacion.longitude.toFixed(4)}`}
                            />
                        )}

                        {/* Recurrence */}
                        {event.recurrencia && (
                            <DetailRow icon="repeat-outline" label={event.recurrencia} />
                        )}
                    </View>

                    <View style={styles.actions}>
                        {/* TODO BACKEND - Hook up edit action */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10464d14', borderColor: '#10464d' }]}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="pencil-outline" size={16} color="#10464d" />
                            <Text style={[styles.actionLabel, { color: '#10464d' }]}>Edit</Text>
                        </TouchableOpacity>

                        {/* TODO BACKEND - Hook up delete action */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#eb8c8514', borderColor: '#eb8c85' }]}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={16} color="#eb8c85" />
                            <Text style={[styles.actionLabel, { color: '#eb8c85' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
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
        <View style={styles.detailRow}>
            <Ionicons name={icon} size={17} color="#888" />
            <Text style={styles.detailLabel}>{label}</Text>
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

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: '#00000040',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 10,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D5D5D5',
        alignSelf: 'center',
        marginBottom: 14,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 8,
    },
    accentBar: {
        width: 4,
        height: 32,
        borderRadius: 2,
        marginTop: 2,
    },
    titleContent: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    description: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 14,
        marginLeft: 16,
    },
    detailsContainer: {
        gap: 10,
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailLabel: {
        fontSize: 15,
        color: '#2D2D2D',
        flexShrink: 1,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderRadius: 14,
        paddingVertical: 11,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
});
