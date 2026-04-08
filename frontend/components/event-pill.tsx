import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { CalendarEvent } from '@/types/calendar';
import { eventPillStyles } from '@/styles/calendar-styles';

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
            style={[eventPillStyles.pill, { backgroundColor: bg + '1A', borderLeftColor: bg }]}
            testID={`event-pill-${event.id}`}
        >
            {event.time && event.time !== '00:00' && (
                <Text style={[eventPillStyles.time, { color: bg }]} numberOfLines={1}>
                    {event.time}
                </Text>
            )}
            <Text style={[eventPillStyles.title, { color: bg }]} numberOfLines={1}>
                {event.title}
            </Text>
        </TouchableOpacity>
    );
}

