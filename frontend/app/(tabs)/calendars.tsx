import React, { useMemo, useRef, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Text,
    Animated,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarHeader } from '@/components/calendar-header';
import { CalendarSelector } from '@/components/calendar-selector';
import { EventFilterBar } from '@/components/event-filter-bar';
import { CalendarGrid } from '@/components/calendar-grid';
import { EventDetailModal } from '@/components/event-detail-modal';
import { CalendarInfoModal } from '@/components/calendar-info-modal';

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatSelectedDay(dateKey: string): string {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${DAY_NAMES[date.getDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export default function CalendarScreen() {
    const today = new Date();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isDesktop = width >= 768;

    const BOTTOM_BAR_HEIGHT = 60 + 20; 
    const sheetBottom = isDesktop ? 0 : BOTTOM_BAR_HEIGHT + insets.bottom;
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [calendars, setCalendars] = useState<Calendar[]>(MOCK_CALENDARS);
    const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);

    const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
    const [infoCalendar, setInfoCalendar] = useState<Calendar | null>(null);

    // Animation for the bottom sheet
    const sheetY = useRef(new Animated.Value(120)).current;

    const showSheet = (dateKey: string) => {
        setSelectedDay(dateKey);
        Animated.spring(sheetY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
        }).start();
    };

    const hideSheet = () => {
        Animated.timing(sheetY, {
            toValue: 120,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setSelectedDay(null));
    };

    const handleDayPress = (dateKey: string) => {
        if (selectedDay === dateKey) {
            hideSheet();
        } else {
            showSheet(dateKey);
        }
    };

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
        <View style={styles.screenWrapper}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.toolbar}>
                    <CalendarSelector
                        calendars={MOCK_CALENDARS}
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

                <View style={styles.filterBlock}>
                    <EventFilterBar selected={selectedEventType} onChange={setSelectedEventType} />
                </View>

                {/* MOBILE: inline add-event banner, sits above the grid inside the scroll */}
                {!isDesktop && selectedDay && (
                    <TouchableOpacity
                        style={styles.mobileBanner}
                        activeOpacity={0.85}
                        onPress={() => router.push('/modal')}
                    >
                        <Text style={styles.mobileBannerDate}>
                            {formatSelectedDay(selectedDay)}
                        </Text>
                        <View style={styles.mobileBannerBtn}>
                            <Text style={styles.mobileBannerBtnText}>＋ Add Event</Text>
                        </View>
                    </TouchableOpacity>
                )}

                <CalendarGrid
                    year={year}
                    month={month}
                    events={filteredEvents}
                    onEventPress={setActiveEvent}
                    selectedDay={selectedDay}
                    onDayPress={handleDayPress}
                />

                <EventDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
                <CalendarInfoModal calendar={infoCalendar} onClose={() => setInfoCalendar(null)} />
            </ScrollView>

            {/* DESKTOP: scrim + animated bottom sheet */}
            {isDesktop && selectedDay && (
                <TouchableWithoutFeedback onPress={hideSheet}>
                    <View style={styles.scrim} />
                </TouchableWithoutFeedback>
            )}

            {isDesktop && (
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            bottom: sheetBottom,
                            transform: [{ translateY: sheetY }],
                        },
                    ]}
                    pointerEvents={selectedDay ? 'auto' : 'none'}
                >
                    <View style={styles.sheetHandle} />

                    <View style={styles.sheetContent}>
                        <View style={styles.sheetTextBlock}>
                            <Text style={styles.sheetLabel}>Add event to</Text>
                            <Text style={styles.sheetDate}>
                                {selectedDay ? formatSelectedDay(selectedDay) : ''}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.addButton}
                            activeOpacity={0.85}
                            onPress={() => router.push('/modal')}
                        >
                            <Text style={styles.addButtonIcon}>＋</Text>
                            <Text style={styles.addButtonLabel}>Add Event</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        backgroundColor: '#FFFDED',
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFDED',
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 100,
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
        marginBottom: 8,
    },
    // Mobile inline add-event banner
    mobileBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 10,
        marginBottom: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#10464d',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    mobileBannerDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10464d',
        flex: 1,
        marginRight: 10,
    },
    mobileBannerBtn: {
        backgroundColor: '#10464d',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 10,
    },
    mobileBannerBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    scrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 32,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 10,
    },
    sheetHandle: {
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D0CFC8',
    },
    sheetContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    sheetTextBlock: {
        flex: 1,
        marginRight: 16,
    },
    sheetLabel: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sheetDate: {
        fontSize: 17,
        fontWeight: '700',
        color: '#10464d',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10464d',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        gap: 6,
    },
    addButtonIcon: {
        color: '#fff',
        fontSize: 18,
        lineHeight: 20,
        fontWeight: '400',
    },
    addButtonLabel: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
