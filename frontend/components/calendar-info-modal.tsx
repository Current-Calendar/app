import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    TouchableOpacity,
    StyleSheet,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from '@/types/calendar';

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
}

/**
 * Modal that shows full info for a specific calendar.
 *
 * TODO BACKEND - Data should come from GET /calendars/:id
 */
export function CalendarInfoModal({ calendar, onClose }: CalendarInfoModalProps) {
    if (!calendar) return null;

    const accent = calendar.color;
    const privacy = PRIVACY_LABELS[calendar.estado] ?? PRIVACY_LABELS.PRIVADO;
    const origin = ORIGIN_LABELS[calendar.origen] ?? ORIGIN_LABELS.CURRENT;

    return (
        <Modal visible={!!calendar} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={() => { }}>
                    <View style={styles.handleBar} />

                    <View style={styles.header}>
                        <View style={[styles.colorBadge, { backgroundColor: accent }]} />
                        <View style={styles.headerContent}>
                            <Text style={styles.title}>{calendar.nombre}</Text>
                            <Text style={styles.creatorText}>by @{calendar.creador}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <Ionicons name="close-circle" size={26} color="#bbb" />
                        </TouchableOpacity>
                    </View>

                    {/* Display cover image (portada) if it exists */}
                    {calendar.portada ? (
                        <Image
                            source={{ uri: calendar.portada }}
                            style={styles.coverImage}
                            resizeMode="cover"
                        />
                    ) : null}

                    {calendar.descripcion ? (
                        <Text style={styles.description}>{calendar.descripcion}</Text>
                    ) : null}

                    <View style={styles.infoGrid}>
                        <View style={[styles.infoCard, { borderLeftColor: accent }]}>
                            <Ionicons name={privacy.icon} size={18} color={accent} />
                            <View>
                                <Text style={styles.infoLabel}>Privacy</Text>
                                <Text style={styles.infoValue}>{privacy.label}</Text>
                            </View>
                        </View>
                        <View style={[styles.infoCard, { borderLeftColor: accent }]}>
                            <Ionicons name={origin.icon} size={18} color={accent} />
                            <View>
                                <Text style={styles.infoLabel}>Source</Text>
                                <Text style={styles.infoValue}>{origin.label}</Text>
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
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
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    colorBadge: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginTop: 4,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    creatorText: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    description: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 16,
    },
    coverImage: {
        width: '100%',
        height: 160,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#E8E5D8',
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    infoCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F7F6F2',
        borderRadius: 12,
        borderLeftWidth: 3,
        padding: 12,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D2D2D',
    },
});
