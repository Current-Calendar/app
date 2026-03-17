import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { CalendarEvent } from '@/types/calendar';

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function pad(n: number) {
    return String(n).padStart(2, '0');
}

function toKey(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildMonthMatrix(year: number, month: number): (Date | null)[][] {
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
        rows.push(cells.slice(i, i + 7));
    }
    return rows;
}

interface CalendarYearGridProps {
    year: number;
    events: CalendarEvent[];
    onMonthPress?: (month: number) => void;
    onDayPress?: (dateKey: string) => void;
}

function MiniMonth({
    year,
    month,
    eventDates,
    todayKey,
    onMonthPress,
    onDayPress,
}: {
    year: number;
    month: number;
    eventDates: Set<string>;
    todayKey: string;
    onMonthPress?: (month: number) => void;
    onDayPress?: (dateKey: string) => void;
}) {
    const matrix = useMemo(() => buildMonthMatrix(year, month), [year, month]);

    return (
        <View style={styles.miniMonth}>
            <TouchableOpacity onPress={() => onMonthPress?.(month)} activeOpacity={0.7}>
                <Text style={styles.miniMonthTitle}>{MONTH_NAMES[month]}</Text>
            </TouchableOpacity>

            <View style={styles.miniWeekRow}>
                {WEEKDAYS.map((d, i) => (
                    <Text key={`${d}-${i}`} style={styles.miniWeekLabel}>{d}</Text>
                ))}
            </View>

            {matrix.map((row, ri) => (
                <View key={ri} style={styles.miniRow}>
                    {row.map((date, ci) => {
                        if (!date) {
                            return <View key={`blank-${ci}`} style={styles.miniCell} />;
                        }
                        const key = toKey(date);
                        const isToday = key === todayKey;
                        const hasEvent = eventDates.has(key);

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.miniCell,
                                    isToday && styles.miniCellToday,
                                ]}
                                activeOpacity={0.7}
                                onPress={() => onDayPress?.(key)}
                            >
                                <Text style={[
                                    styles.miniDayText,
                                    isToday && styles.miniDayTextToday,
                                    ci >= 5 && !isToday && styles.miniDayTextWeekend,
                                ]}>
                                    {date.getDate()}
                                </Text>
                                {hasEvent && <View style={styles.eventDot} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

export function CalendarYearGrid({ year, events, onMonthPress, onDayPress }: CalendarYearGridProps) {
    const { width } = useWindowDimensions();
    const columns = width >= 768 ? 4 : width >= 480 ? 3 : 2;

    const eventDates = useMemo(() => {
        const set = new Set<string>();
        for (const ev of events) {
            set.add(ev.date);
        }
        return set;
    }, [events]);

    const todayKey = toKey(new Date());

    const months = Array.from({ length: 12 }, (_, i) => i);

    // Split months into rows
    const rows: number[][] = [];
    for (let i = 0; i < 12; i += columns) {
        rows.push(months.slice(i, i + columns));
    }

    return (
        <View style={styles.wrapper}>
            {rows.map((row, ri) => (
                <View key={ri} style={styles.yearRow}>
                    {row.map((m) => (
                        <View key={m} style={[styles.monthContainer, { flex: 1 }]}>
                            <MiniMonth
                                year={year}
                                month={m}
                                eventDates={eventDates}
                                todayKey={todayKey}
                                onMonthPress={onMonthPress}
                                onDayPress={onDayPress}
                            />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: '#fff',
        marginHorizontal: 10,
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    yearRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    monthContainer: {
        minWidth: 0,
    },
    miniMonth: {
        padding: 6,
    },
    miniMonthTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10464d',
        marginBottom: 4,
        textAlign: 'center',
    },
    miniWeekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 2,
    },
    miniWeekLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: '#888',
        width: 16,
        textAlign: 'center',
    },
    miniRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    miniCell: {
        width: 16,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
    miniCellToday: {
        backgroundColor: '#10464d',
        borderRadius: 8,
    },
    miniDayText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    miniDayTextToday: {
        color: '#fff',
        fontWeight: '700',
    },
    miniDayTextWeekend: {
        color: '#eb8c85',
    },
    eventDot: {
        position: 'absolute',
        bottom: 1,
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#10464d',
    },
});
