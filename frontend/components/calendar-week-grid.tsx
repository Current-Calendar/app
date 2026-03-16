import React, { useMemo, useState } from 'react';
import { View, Text, LayoutChangeEvent, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarEvent } from '@/types/calendar';
import { EventPill } from '@/components/event-pill';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n: number) {
    return String(n).padStart(2, '0');
}

function toKey(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Get the Monday of the week containing the given date. */
function getWeekStart(year: number, month: number, day: number): Date {
    const d = new Date(year, month, day);
    const dow = d.getDay(); // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    return monday;
}

interface CalendarWeekGridProps {
    year: number;
    month: number;
    day: number;
    events: CalendarEvent[];
    onEventPress?: (event: CalendarEvent) => void;
    selectedDay?: string | null;
    onDayPress?: (dateKey: string) => void;
}

export function CalendarWeekGrid({ year, month, day, events, onEventPress, selectedDay, onDayPress }: CalendarWeekGridProps) {
    const [containerWidth, setContainerWidth] = useState(0);

    const handleLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

    const cellWidth = containerWidth > 0 ? containerWidth / 7 : undefined;

    const weekDays = useMemo(() => {
        const monday = getWeekStart(year, month, day);
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    }, [year, month, day]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const ev of events) {
            (map[ev.date] ??= []).push(ev);
        }
        return map;
    }, [events]);

    const todayKey = toKey(new Date());

    return (
        <View style={styles.wrapper} onLayout={handleLayout}>
            {containerWidth > 0 && (
                <>
                    <View style={styles.weekRow}>
                        {weekDays.map((date, i) => (
                            <View key={i} style={[styles.weekCell, { width: cellWidth }]}>
                                <Text style={[styles.weekLabel, i >= 5 && styles.weekLabelWeekend]}>
                                    {WEEKDAYS[i]}
                                </Text>
                                <Text style={[styles.weekDateLabel, i >= 5 && styles.weekLabelWeekend]}>
                                    {date.getDate()}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.gridBody}>
                        <View style={styles.row}>
                            {weekDays.map((date, ci) => {
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
                                        <View style={styles.eventsContainer}>
                                            {dayEvents.map((ev) => (
                                                <EventPill key={ev.id} event={ev} onPress={onEventPress} />
                                            ))}
                                            {dayEvents.length === 0 && (
                                                <Text style={styles.noEvents}>-</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
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
    weekDateLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
        marginTop: 2,
    },
    weekLabelWeekend: {
        color: '#eb8c85',
    },
    gridBody: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        minHeight: 200,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#E8E5D8',
        padding: 4,
        backgroundColor: '#fff',
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
    eventsContainer: {
        flex: 1,
    },
    noEvents: {
        textAlign: 'center',
        color: '#ccc',
        marginTop: 8,
        fontSize: 12,
    },
});
