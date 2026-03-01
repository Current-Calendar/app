import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert,Pressable,Text } from 'react-native';

import { CalendarHeader } from '@/components/calendar-header';
import { CalendarSelector } from '@/components/calendar-selector';
import { EventFilterBar } from '@/components/event-filter-bar';
import { CalendarGrid } from '@/components/calendar-grid';
import { EventDetailModal } from '@/components/event-detail-modal';
import { CalendarInfoModal } from '@/components/calendar-info-modal';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Calendar, CalendarEvent, EventType } from '@/types/calendar';
import { MOCK_CALENDARS, MOCK_EVENTS } from '@/constants/mock-data';
import { API_CONFIG } from '@/constants/api';

// TODO BACKEND - Replace MOCK_CALENDARS / MOCK_EVENTS with calls to:
//   GET /calendars          -> CalendarsResponse
//   GET /events?calendarId= -> EventsResponse

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [calendars, setCalendars] = useState<Calendar[]>(MOCK_CALENDARS);
    const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
    const navigation = useNavigation<any>();

    const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
    const [infoCalendar, setInfoCalendar] = useState<Calendar | null>(null);
    const [deletingCalendarId, setDeletingCalendarId] = useState<string | null>(null);

    // TODO BACKEND - Once endpoints exist, move filtering server-side
    const filteredEvents = useMemo(() => {
        let list = events;
        if (selectedCalendarId) {
            list = list.filter((e) => e.calendarId === selectedCalendarId);
        }
        if (selectedEventType) {
            list = list.filter((e) => e.type === selectedEventType);
        }
        return list;
    }, [events, selectedCalendarId, selectedEventType]);

    const removeCalendarFromState = (calendarId: string) => {
        setCalendars((current) => current.filter((item) => item.id !== calendarId));
        setEvents((current) => current.filter((event) => event.calendarId !== calendarId));
        setSelectedCalendarId((current) => (current === calendarId ? null : current));
        setActiveEvent((current) => (current?.calendarId === calendarId ? null : current));
        setInfoCalendar(null);
    };

    const handleDeleteCalendar = async (calendar: Calendar) => {
        const calendarId = Number(calendar.id);

        // Fallback for mock/local calendars that do not map to backend integer IDs.
        if (!Number.isInteger(calendarId) || calendarId <= 0) {
            removeCalendarFromState(calendar.id);
            return;
        }

        setDeletingCalendarId(calendar.id);
        try {
            const response = await fetch(API_CONFIG.endpoints.deleteCalendar(calendarId), {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            removeCalendarFromState(calendar.id);
        } catch {
            Alert.alert('Delete failed', 'Could not delete the calendar. Please try again.');
        } finally {
            setDeletingCalendarId(null);
        }
    };

    const handleDeleteCalendarPress = (calendar: Calendar) => {
        if (deletingCalendarId) {
            return;
        }

        void handleDeleteCalendar(calendar);
    };

    const goToPrevMonth = () => {
        if (month === 0) {
            setMonth(11);
            setYear((y) => y - 1);
        } else {
            setMonth((m) => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (month === 11) {
            setMonth(0);
            setYear((y) => y + 1);
        } else {
            setMonth((m) => m + 1);
        }
    };

    const goToToday = () => {
        const now = new Date();
        setYear(now.getFullYear());
        setMonth(now.getMonth());
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.toolbar}>
                <CalendarSelector
                    calendars={calendars}
                    selectedId={selectedCalendarId}
                    onChange={setSelectedCalendarId}
                    onInfoPress={setInfoCalendar}
                />
            </View>

            <View style={styles.headerBlock}>
            <CalendarHeader
                monthLabel={`${MONTH_NAMES[month]} ${year}`}
                onPrevMonth={goToPrevMonth}
                onNextMonth={goToNextMonth}
                onTodayPress={goToToday}
            />
            </View>

            <View style={styles.filterRow}>
            <EventFilterBar
                selected={selectedEventType}
                onChange={setSelectedEventType}
            />

            <Pressable
                style={styles.createBtn}
                onPress={() => {
                 navigation.navigate('create_events');
                }}
            >
                <Ionicons name="add" size={16} color="#10464D" />
                <Text style={styles.createBtnText}>Create event</Text>
            </Pressable>
            </View>

            <CalendarGrid
                year={year}
                month={month}
                events={filteredEvents}
                onEventPress={setActiveEvent}
            />

            <EventDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
            <CalendarInfoModal
                calendar={infoCalendar}
                onClose={() => setInfoCalendar(null)}
                onDelete={handleDeleteCalendarPress}
                isDeleting={Boolean(infoCalendar && deletingCalendarId === infoCalendar.id)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8E5D8',
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 100, // room for mobile bottom bar
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        marginBottom: 8,
    },
    headerBlock: {
        marginBottom: 12,
    },
    filterBlock: {
        marginBottom: 20,
    },
    createRow: {
    marginTop: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    },

    createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(16,70,77,0.25)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    },

    createBtnText: {
    color: '#10464D',
    fontWeight: '900',
    fontSize: 12,
    },
    filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
    },
});
