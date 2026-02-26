import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
        <View style={styles.container}>
            <TouchableOpacity onPress={onTodayPress} style={styles.todayBtn} activeOpacity={0.7}>
                <Ionicons name="today-outline" size={15} color="#10464d" />
                <Text style={styles.todayLabel}>Today</Text>
            </TouchableOpacity>

            <View style={styles.nav}>
                <TouchableOpacity onPress={onPrevMonth} hitSlop={12} style={styles.arrowBtn} activeOpacity={0.6}>
                    <Ionicons name="chevron-back" size={20} color="#10464d" />
                </TouchableOpacity>

                <Text style={styles.monthLabel}>{monthLabel}</Text>

                <TouchableOpacity onPress={onNextMonth} hitSlop={12} style={styles.arrowBtn} activeOpacity={0.6}>
                    <Ionicons name="chevron-forward" size={20} color="#10464d" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    todayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    todayLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#10464d',
    },
    nav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    monthLabel: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2D2D2D',
        minWidth: 150,
        textAlign: 'center',
    },
    arrowBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
});
