import React from 'react';
import { Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventType } from '@/types/calendar';
import { AppColors } from '@/styles/tokens';
import { eventFilterBarStyles } from '@/styles/calendar-styles';

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
            contentContainerStyle={eventFilterBarStyles.strip}
        >
            {EVENT_TYPE_OPTIONS.map((opt) => {
                const isActive =
                    (opt.type === '__all__' && selected === null) || opt.type === selected;

                return (
                    <TouchableOpacity
                        key={opt.type}
                        onPress={() => onChange(opt.type === '__all__' ? null : (opt.type as EventType))}
                        style={[
                            eventFilterBarStyles.chip,
                            isActive ? eventFilterBarStyles.chipActive : eventFilterBarStyles.chipInactive,
                        ]}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={opt.icon}
                            size={14}
                            color={isActive ? AppColors.surface : AppColors.brand}
                        />
                        <Text
                            style={[
                                eventFilterBarStyles.label,
                                { color: isActive ? AppColors.surface : AppColors.textPrimary },
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
