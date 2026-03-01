import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    LayoutChangeEvent,
    TouchableOpacity,
} from 'react-native';
import { CalendarEvent } from '@/types/calendar';
import { EventPill } from '@/components/event-pill';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n: number) {
    return String(n).padStart(2, '0');
}

function toKey(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildMonthMatrix(year: number, month: number): (Date | null)[][] {
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday = 0
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

interface CalendarGridProps {
    year: number;
    /** 0-indexed month (0 = January). */
    month: number;
    events: CalendarEvent[];
    onEventPress?: (event: CalendarEvent) => void;
    /** ISO date string (YYYY-MM-DD) of the currently selected day. */
    selectedDay?: string | null;
    onDayPress?: (dateKey: string) => void;
}

export function CalendarGrid({ year, month, events, onEventPress, selectedDay, onDayPress }: CalendarGridProps) {
    const [containerWidth, setContainerWidth] = useState(0);

    const handleLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

    const cellWidth = containerWidth > 0 ? containerWidth / 7 : undefined;

    const matrix = useMemo(() => buildMonthMatrix(year, month), [year, month]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const ev of events) {
            (map[ev.fecha] ??= []).push(ev);
        }
        return map;
    }, [events]);

    const todayKey = toKey(new Date());

    return (
        <View style={styles.wrapper} onLayout={handleLayout}>
            {containerWidth > 0 && (
                <>
                    <View style={styles.weekRow}>
                        {WEEKDAYS.map((d, i) => {
                            const isWeekend = i >= 5;
                            return (
                                <View key={d} style={[styles.weekCell, { width: cellWidth }]}>
                                    <Text style={[styles.weekLabel, isWeekend && styles.weekLabelWeekend]}>{d}</Text>
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.gridBody}>
                        {matrix.map((row, ri) => (
                            <View key={ri} style={styles.row}>
                                {row.map((date, ci) => {
                                    if (!date) {
                                        return (
                                            <View
                                                key={`blank-${ci}`}
                                                style={[styles.cell, styles.cellBlank, { width: cellWidth }]}
                                            />
                                        );
                                    }

                                    const key = toKey(date);
                                    const isToday = key === todayKey;
                                    const isSelected = key === selectedDay;
                                    const dayEvents = eventsByDate[key] ?? [];
                                    const isWeekend = ci >= 5;

                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            activeOpacity={0.75}
                                            onPress={() => onDayPress?.(key)}
                                            style={[
                                                styles.cell,
                                                { width: cellWidth },
                                                isToday && styles.cellToday,
                                                isWeekend && !isToday && styles.cellWeekend,
                                                isSelected && styles.cellSelected,
                                            ]}
                                        >
                                            <View style={styles.dayHeader}>
                                                <View style={[
                                                    styles.dayBadge,
                                                    isToday && styles.dayBadgeToday,
                                                    isSelected && styles.dayBadgeSelected,
                                                ]}>
                                                    <Text
                                                        style={[
                                                            styles.dayNumber,
                                                            isToday && styles.dayNumberToday,
                                                            isSelected && styles.dayNumberSelected,
                                                            isWeekend && !isToday && !isSelected && styles.dayNumberWeekend,
                                                        ]}
                                                    >
                                                        {date.getDate()}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.eventsContainer}>
                                                {dayEvents.slice(0, 3).map((ev) => (
                                                    <EventPill key={ev.id} event={ev} onPress={onEventPress} />
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <Text style={styles.overflow}>+{dayEvents.length - 3} more</Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#fff',
        marginHorizontal: 10,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    weekRow: {
        flexDirection: 'row',
        backgroundColor: '#10464d',
    },
    weekCell: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: '#ffffffCC',
    },
    weekLabelWeekend: {
        color: '#eb8c85',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 4,
    },
    gridBody: {
        flex: 1, // Let the body fill the wrapper
    },
    row: {
        flex: 1, // Let rows stretch equally
        flexDirection: 'row',
    },
    cell: {
        minHeight: 84,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#E8E5D8',
        padding: 3,
        backgroundColor: '#fff',
    },
    cellBlank: {
        backgroundColor: '#F7F6F2',
    },
    cellToday: {
        backgroundColor: '#10464d08',
        borderColor: '#10464d40',
    },
    cellWeekend: {
        backgroundColor: '#FAFAF6',
    },
    cellSelected: {
        backgroundColor: '#10464d18',
        borderColor: '#10464d',
        borderWidth: 1.5,
    },
    dayHeader: {
        flexDirection: 'row',
        marginBottom: 1,
    },
    dayBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayBadgeToday: {
        backgroundColor: '#10464d',
    },
    dayBadgeSelected: {
        backgroundColor: '#10464d',
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    dayNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    dayNumberToday: {
        color: '#fff',
        fontWeight: '700',
    },
    dayNumberSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    dayNumberWeekend: {
        color: '#eb8c85',
    },
    eventsContainer: {
        flexShrink: 1,
    },
    overflow: {
        fontSize: 9,
        fontWeight: '600',
        marginTop: 2,
        paddingLeft: 4,
        color: '#888',
    },
});
