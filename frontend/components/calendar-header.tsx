import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/styles/tokens';
import { calendarHeaderStyles } from '@/styles/calendar-styles';

export type CalendarViewMode = 'week' | 'month' | 'year';

interface CalendarHeaderProps {
    /** Display label for the current period, e.g. "February 2026" */
    monthLabel: string;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onTodayPress: () => void;
    viewMode?: CalendarViewMode;
    onViewModeChange?: (mode: CalendarViewMode) => void;
}

const VIEW_OPTIONS: { mode: CalendarViewMode; label: string }[] = [
    { mode: 'week', label: 'Week' },
    { mode: 'month', label: 'Month' },
    { mode: 'year', label: 'Year' },
];

export function CalendarHeader({
    monthLabel,
    onPrevMonth,
    onNextMonth,
    onTodayPress,
    viewMode = 'month',
    onViewModeChange,
}: CalendarHeaderProps) {
    return (
        <View style={calendarHeaderStyles.container}>
            <View style={calendarHeaderStyles.leftGroup}>
                <TouchableOpacity onPress={onTodayPress} style={calendarHeaderStyles.todayBtn} activeOpacity={0.7}>
                    <Ionicons name="today-outline" size={15} color={AppColors.brand} />
                    <Text style={calendarHeaderStyles.todayLabel}>Today</Text>
                </TouchableOpacity>

                {onViewModeChange && (
                    <View style={calendarHeaderStyles.viewModeContainer}>
                        {VIEW_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.mode}
                                style={[
                                    calendarHeaderStyles.viewModeBtn,
                                    viewMode === opt.mode && calendarHeaderStyles.viewModeBtnActive,
                                ]}
                                onPress={() => onViewModeChange(opt.mode)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        calendarHeaderStyles.viewModeLabel,
                                        viewMode === opt.mode && calendarHeaderStyles.viewModeLabelActive,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

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
