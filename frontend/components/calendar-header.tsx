import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/styles/tokens';
import { calendarHeaderStyles } from '@/styles/calendar-styles';

interface CalendarHeaderProps {
    /** Display label for the current month/year, e.g. "February 2026" */
    monthLabel: string;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onTodayPress: () => void;
}

export function CalendarHeader({
    monthLabel,
    onPrevMonth,
    onNextMonth,
    onTodayPress,
}: CalendarHeaderProps) {
    return (
        <View style={calendarHeaderStyles.container}>
            <TouchableOpacity onPress={onTodayPress} style={calendarHeaderStyles.todayBtn} activeOpacity={0.7}>
                <Ionicons name="today-outline" size={15} color={AppColors.brand} />
                <Text style={calendarHeaderStyles.todayLabel}>Today</Text>
            </TouchableOpacity>

            <View style={calendarHeaderStyles.nav}>
                <TouchableOpacity onPress={onPrevMonth} hitSlop={12} style={calendarHeaderStyles.arrowBtn} activeOpacity={0.6}>
                    <Ionicons name="chevron-back" size={20} color={AppColors.brand} />
                </TouchableOpacity>

                <Text style={calendarHeaderStyles.monthLabel}>{monthLabel}</Text>

                <TouchableOpacity onPress={onNextMonth} hitSlop={12} style={calendarHeaderStyles.arrowBtn} activeOpacity={0.6}>
                    <Ionicons name="chevron-forward" size={20} color={AppColors.brand} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
