import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    LayoutChangeEvent,
    TouchableOpacity,
} from 'react-native';
import { CalendarEvent } from '@/types/calendar';
import { EventPill } from '@/components/event-pill';
import { calendarGridStyles } from '@/styles/calendar-styles';

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
            (map[ev.date] ??= []).push(ev);
        }
        return map;
    }, [events]);

    const todayKey = toKey(new Date());

    return (
        <View style={calendarGridStyles.wrapper} onLayout={handleLayout}>
            {containerWidth > 0 && (
                <>
                    <View style={calendarGridStyles.weekRow}>
                        {WEEKDAYS.map((d, i) => {
                            const isWeekend = i >= 5;
                            return (
                                <View key={d} style={[calendarGridStyles.weekCell, { width: cellWidth }]}>
                                    <Text style={[calendarGridStyles.weekLabel, isWeekend && calendarGridStyles.weekLabelWeekend]}>{d}</Text>
                                </View>
                            );
                        })}
                    </View>

                    <View style={calendarGridStyles.gridBody}>
                        {matrix.map((row, ri) => (
                            <View key={ri} style={calendarGridStyles.row}>
                                {row.map((date, ci) => {
                                    if (!date) {
                                        return (
                                            <View
                                                key={`blank-${ci}`}
                                                style={[calendarGridStyles.cell, calendarGridStyles.cellBlank, { width: cellWidth }]}
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
                                                calendarGridStyles.cell,
                                                { width: cellWidth },
                                                isToday && calendarGridStyles.cellToday,
                                                isWeekend && !isToday && calendarGridStyles.cellWeekend,
                                                isSelected && calendarGridStyles.cellSelected,
                                            ]}
                                        >
                                            <View style={calendarGridStyles.dayHeader}>
                                                <View style={[
                                                    calendarGridStyles.dayBadge,
                                                    isToday && calendarGridStyles.dayBadgeToday,
                                                    isSelected && calendarGridStyles.dayBadgeSelected,
                                                ]}>
                                                    <Text
                                                        style={[
                                                            calendarGridStyles.dayNumber,
                                                            isToday && calendarGridStyles.dayNumberToday,
                                                            isSelected && calendarGridStyles.dayNumberSelected,
                                                            isWeekend && !isToday && !isSelected && calendarGridStyles.dayNumberWeekend,
                                                        ]}
                                                    >
                                                        {date.getDate()}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={calendarGridStyles.eventsContainer}>
                                                {dayEvents.slice(0, 3).map((ev) => (
                                                    <EventPill key={ev.id} event={ev} onPress={onEventPress} />
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <Text style={calendarGridStyles.overflow}>+{dayEvents.length - 3} more</Text>
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

