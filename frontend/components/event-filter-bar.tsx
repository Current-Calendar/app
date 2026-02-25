import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventType } from '@/types/calendar';

type FilterOption = {
    type: EventType | '__all__';
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
};

const EVENT_TYPE_OPTIONS: FilterOption[] = [
    { type: '__all__', label: 'All', icon: 'grid-outline' },
    { type: 'meeting', label: 'Meeting', icon: 'people-outline' },
    { type: 'task', label: 'Task', icon: 'checkmark-circle-outline' },
    { type: 'reminder', label: 'Reminder', icon: 'notifications-outline' },
    { type: 'holiday', label: 'Holiday', icon: 'sunny-outline' },
    { type: 'birthday', label: 'Birthday', icon: 'gift-outline' },
    { type: 'other', label: 'Other', icon: 'flag-outline' },
];

interface EventFilterBarProps {
    selected: EventType | null; // null = all
    onChange: (type: EventType | null) => void;
}

/**
 * Horizontal chip strip to filter events by type.
 */
export function EventFilterBar({ selected, onChange }: EventFilterBarProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
        >
            {EVENT_TYPE_OPTIONS.map((opt) => {
                const isActive =
                    (opt.type === '__all__' && selected === null) || opt.type === selected;

                return (
                    <TouchableOpacity
                        key={opt.type}
                        onPress={() => onChange(opt.type === '__all__' ? null : (opt.type as EventType))}
                        style={[
                            styles.chip,
                            isActive ? styles.chipActive : styles.chipInactive,
                        ]}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={opt.icon}
                            size={14}
                            color={isActive ? '#fff' : '#10464d'}
                        />
                        <Text
                            style={[
                                styles.label,
                                { color: isActive ? '#fff' : '#2D2D2D' },
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    strip: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        gap: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    chipActive: {
        backgroundColor: '#10464d',
        shadowColor: '#10464d',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    chipInactive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
});
