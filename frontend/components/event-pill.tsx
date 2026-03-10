import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarEvent } from '@/types/calendar';

interface EventPillProps {
    event: CalendarEvent;
    onPress?: (event: CalendarEvent) => void;
}

/**
 * A compact colored pill shown inside a calendar day cell.
 */
export function EventPill({ event, onPress }: EventPillProps) {
    const bg = event.color ?? '#10464d';

    return (
        <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onPress?.(event)}
            style={[styles.pill, { backgroundColor: bg + '1A', borderLeftColor: bg }]}
        >
            {event.time && event.time !== '00:00' && (
                <Text style={[styles.time, { color: bg }]} numberOfLines={1}>
                    {event.time}
                </Text>
            )}
            <Text style={[styles.title, { color: bg }]} numberOfLines={1}>
                {event.title}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 3,
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
        marginTop: 2,
        gap: 3,
    },
    time: {
        fontSize: 8,
        fontWeight: '700',
        opacity: 0.8,
    },
    title: {
        fontSize: 9,
        fontWeight: '600',
        flexShrink: 1,
    },
});
