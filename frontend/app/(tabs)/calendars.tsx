import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, Modal, TextInput } from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarGrid } from '@/components/calendar-grid';
import { CalendarHeader, CalendarViewMode } from '@/components/calendar-header';
import { CalendarWeekGrid } from '@/components/calendar-week-grid';
import { CalendarYearGrid } from '@/components/calendar-year-grid';
import { CalendarInfoModal } from '@/components/calendar-info-modal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CalendarSelector } from '@/components/calendar-selector';
import { EventDetailModal } from '@/components/event-detail-modal';
import { EventFilterBar } from '@/components/event-filter-bar';

import { Calendar, CalendarEvent, EventType } from '@/types/calendar';

import * as Sharing from "expo-sharing";
import { toPng } from "html-to-image";
import { captureRef } from "react-native-view-shot";

import { useCalendars } from '@/hooks/use-calendars';
import { useEventsList } from '@/hooks/use-events';
import { useCalendarTransfer } from '@/hooks/use-calendar-transfer';
import { useCalendarActions } from '@/hooks/use-calendar-actions';
import { downloadCalendar, importGoogleCalendar, importICS, importIOSCalendar } from '@/services/calendarService';
import { useAuth } from '@/hooks/use-auth';
import apiClient from '@/services/api-client';
import { ImportCalendarModal } from '@/components/import-calendar-modal';
import { LabelFilterBar } from '@/components/label-filter-bar';
import { useEventLabels } from '@/hooks/use-event-labels';
import { LabelManagerModal } from '@/components/label-manager-modal';

// TODO BACKEND - Replace MOCK_CALENDARS / MOCK_EVENTS with calls to:
//   GET /calendars          -> CalendarsResponse
//   GET /events?calendarId= -> EventsResponse
const todayKey = new Date().toISOString().slice(0, 10);
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
    const { isAuthenticated } = useAuth();
    const { downloadCalendarFile } = useCalendarTransfer();
    const { deleteCalendar } = useCalendarActions();
    const today = new Date();
    const router = useRouter();
    const params = useLocalSearchParams<{ selectedCalendarId?: string }>();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isDesktop = width >= 768;

    const BOTTOM_BAR_HEIGHT = 60 + 25;
    const sheetBottom = isDesktop ? 0 : BOTTOM_BAR_HEIGHT + insets.bottom;
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [weekDay, setWeekDay] = useState(today.getDate());
    const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
    const [calendars, setCalendars] = useState<Calendar[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const isWeb = Platform.OS === "web";

    const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
    const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
    const [infoCalendar, setInfoCalendar] = useState<Calendar | null>(null);
    const [deletingCalendarId, setDeletingCalendarId] = useState<string | null>(null);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [labelManagerVisible, setLabelManagerVisible] = useState(false);
    const [loadingCalendars, setLoadingCalendars] = useState(true);
    const [calendarsError, setCalendarsError] = useState<unknown>(null);

    const {
        labels: labelCatalog,
        customLabels,
        assignments: labelAssignments,
        getLabelsForEvent,
        labelIdFromType,
        addCustomLabel,
        removeCustomLabel,
        colorPalette,
    } = useEventLabels();

    useEffect(() => {
        if (selectedLabelId && !labelCatalog.find((l) => l.id === selectedLabelId)) {
            setSelectedLabelId(null);
        }
    }, [labelCatalog, selectedLabelId]);

    const {
        events: backendEvents,
        loading: loadingEvents,
        error: eventsError,
        refetch: refetchEvents,
    } = useEventsList();
    const fetchData = async () => {
        try {
            setLoadingCalendars(true);
            setCalendarsError(null);

            const [myCalendarsData, subscribedCalendarsData, friendsCalendarsData] = await Promise.all([
                apiClient.get<any[]>('/calendars/my-calendars/'),
                apiClient.get<any[]>('/calendars/subscribed/'),
                apiClient.get<any[]>('/calendars/friends-calendars/'),
            ]);

            const COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB84C', '#FF9F43', '#00CFE8'];

            const mergedCalendarsMap = new Map<number, any>();

            myCalendarsData.forEach((calendar: any) => {
                mergedCalendarsMap.set(calendar.id, calendar);
            });

            subscribedCalendarsData.forEach((calendar: any) => {
                mergedCalendarsMap.set(calendar.id, calendar);
            });

            friendsCalendarsData.forEach((calendar: any) => {
                mergedCalendarsMap.set(calendar.id, calendar);
            });

            const mergedCalendars = Array.from(mergedCalendarsMap.values());

            const mappedCalendars: Calendar[] = mergedCalendars.map((c: any, index: number) => ({
                id: String(c.id),
                name: c.name,
                description: c.description || '',
                cover: c.cover || undefined,
                privacy: c.privacy,
                origin: c.origin,
                creator: c.creator_username || 'unknown',
                color: COLORS[index % COLORS.length],
            }));

            setCalendars(mappedCalendars);

            await refetchEvents();
        } catch (e) {
            console.error("Error al refrescar calendarios:", e);
            setCalendarsError(e);
        } finally {
            setLoadingCalendars(false);
        }
    };
    useEffect(() => {
        void fetchData();
    }, []);
    useEffect(() => {
        if (calendarsError || eventsError) {
            console.error('Error fetching data:', calendarsError || eventsError);
            Alert.alert('Error', 'Could not load calendars or events.');
        }
    }, [calendarsError, eventsError]);

    useEffect(() => {
        const visibleCalendarIds = new Set(calendars.map((c) => Number(c.id)));

        const mappedEvents: CalendarEvent[] = backendEvents
            .filter((e: any) =>
                e.calendars?.some((calendarId: number) => visibleCalendarIds.has(calendarId))
            )
            .map((e: any) => {
                const calendar = calendars.find(c => e.calendars.includes(Number(c.id)));
                const type = (e.type || e.tipo || 'other') as EventType;
                const typeLabelId = labelIdFromType(type);
                const manualLabels = getLabelsForEvent(String(e.id));
                const labels = Array.from(new Set([
                    ...(typeLabelId ? [typeLabelId] : []),
                    ...(manualLabels ?? []),
                ]));

                return {
                    id: String(e.id),
                    calendarId: String(e.calendars[0] || ''),
                    title: e.title,
                    description: e.description || '',
                    place_name: e.place_name || '',
                    date: e.date,
                    time: e.time.substring(0, 5),
                    recurrence: e.recurrence,
                    type,
                    labels,
                    color: calendar?.color || '#6C63FF',
                };
            });

        setEvents(mappedEvents);
    }, [backendEvents, calendars, labelAssignments, getLabelsForEvent, labelIdFromType]);

    useEffect(() => {
        if (params.selectedCalendarId) {
            setSelectedCalendarId(params.selectedCalendarId);
        }
    }, [params.selectedCalendarId]);

    const [open, setOpen] = useState(false);
    const rotation = useRef(new Animated.Value(0)).current;
    const calendarRef = useRef<View>(null);
    // Animation for the bottom sheet
    const sheetY = useRef(new Animated.Value(120)).current;
    const optionAnimations = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    const showSheet = (dateKey: string) => {
        setSelectedDay(dateKey);
        if (open) toggleMenu();
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
        if (selectedLabelId) {
            list = list.filter((e) => e.labels?.includes(selectedLabelId));
        }
        return list;
    }, [events, selectedCalendarId, selectedEventType, selectedLabelId]);

    const eventsOfSelectedDay = useMemo(() => {
        if (!selectedDay) return [];

        return filteredEvents.filter(
            (event) => event.date?.slice(0, 10) === selectedDay
        );
    }, [filteredEvents, selectedDay]);

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

        if (!isAuthenticated) {
            Alert.alert('Unauthorized', 'You must be logged in to delete a calendar.');
            return;
        }

        setDeletingCalendarId(calendar.id);
        try {
            await deleteCalendar(calendar.id);
            setInfoCalendar(null);
            await fetchData();
        } catch (e) {
            console.error('Delete error:', e);
            Alert.alert('Delete failed', String(e));
            Alert.alert('Delete failed', 'Could not delete the calendar. Please try again.');
        } finally {
            setDeletingCalendarId(null);
        }
    };

    const goToPrev = () => {
        if (viewMode === 'week') {
            const d = new Date(year, month, weekDay - 7);
            setYear(d.getFullYear());
            setMonth(d.getMonth());
            setWeekDay(d.getDate());
        } else if (viewMode === 'year') {
            setYear((y) => y - 1);
        } else {
            if (month === 0) {
                setMonth(11);
                setYear((y) => y - 1);
            } else {
                setMonth((m) => m - 1);
            }
        }
    };

    const goToNext = () => {
        if (viewMode === 'week') {
            const d = new Date(year, month, weekDay + 7);
            setYear(d.getFullYear());
            setMonth(d.getMonth());
            setWeekDay(d.getDate());
        } else if (viewMode === 'year') {
            setYear((y) => y + 1);
        } else {
            if (month === 11) {
                setMonth(0);
                setYear((y) => y + 1);
            } else {
                setMonth((m) => m + 1);
            }
        }
    };

    const goToToday = () => {
        const now = new Date();
        setYear(now.getFullYear());
        setMonth(now.getMonth());
        setWeekDay(now.getDate());
    };

    const handleViewModeChange = (mode: CalendarViewMode) => {
        setViewMode(mode);
        // When switching to week, use current date context
        if (mode === 'week') {
            setWeekDay(new Date(year, month, 1).getDate());
        }
    };

    const getHeaderLabel = (): string => {
        if (viewMode === 'year') return String(year);
        if (viewMode === 'week') {
            // Show the week range
            const d = new Date(year, month, weekDay);
            const dow = d.getDay();
            const mondayOffset = dow === 0 ? -6 : 1 - dow;
            const monday = new Date(d);
            monday.setDate(d.getDate() + mondayOffset);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            const fmtDay = (dt: Date) => `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()].substring(0, 3)}`;
            return `${fmtDay(monday)} – ${fmtDay(sunday)} ${sunday.getFullYear()}`;
        }
        return `${MONTH_NAMES[month]} ${year}`;
    };
    // Added loading para esperar a datos
    const loading = loadingCalendars || loadingEvents;
    if (loading) {
        return (
            <View style={[styles.screenWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#10464d" />
            </View>
        );
    }

    const toggleMenu = () => {
        const isOpening = !open;

        Animated.timing(rotation, {
            toValue: open ? 0 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        const animations = optionAnimations.map((anim, i) =>
            Animated.timing(anim, {
                toValue: open ? 0 : 1,
                duration: 200,
                delay: i * 50,
                useNativeDriver: true,
            })
        );
        Animated.stagger(50, isOpening ? animations : animations.reverse()).start(() => {
            if (!isOpening) setOpen(false);
        });
        if (isOpening) setOpen(true);
    };

    const rotateInterpolate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

    const exportCalendar = async () => {
        if (!selectedCalendarId) {
            alert("Please select a calendar before exporting");
            return;
        }
        try {
            if (Platform.OS === "web") {
                await downloadCalendarFile(selectedCalendarId);
                alert("Calendario descargado correctamente");
            } else {
                const fileUri = await downloadCalendarFile(selectedCalendarId);
                if (await Sharing.isAvailableAsync() && fileUri) {
                    await Sharing.shareAsync(fileUri);
                } else {
                    alert("File saved at: " + fileUri);
                }
            }
        } catch (error) {
            alert("Could not download the calendar.");
            console.log(error);
        }
    };

    const exportPng = async () => {
        try {
            if (Platform.OS === "web") {
                const node = document.getElementById("calendar-web");
                if (!node) return;

                const dataUrl = await toPng(node);
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = "calendar.png";
                link.click();

            } else {
                if (!calendarRef.current) return;

                const uri = await captureRef(calendarRef.current, {
                    format: "png",
                    quality: 1,
                });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri);
                } else {
                    alert("Image saved at: " + uri);
                }
            }
        } catch (error) {
            console.error(error);
            alert("Could not export the calendar as PNG");
        }
    }

    return (
        <View style={styles.screenWrapper}>
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

                    {isDesktop && (
                        <View style={styles.toolbarButtons}>


                            <TouchableOpacity
                                style={styles.primaryBtn}
                                activeOpacity={0.7}
                                onPress={() =>
                                    router.push(`/create_events?date=${selectedDay ?? todayKey}&calendarId=${selectedCalendarId ?? ''}`)
                                }
                            >
                                <Ionicons name="add" size={18} color="#fff" />
                                <Text style={styles.primaryBtnText}>New Event</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                activeOpacity={0.7}
                                onPress={() => router.push('/(tabs)/create')}
                            >
                                <Ionicons name="calendar-outline" size={18} color="#10464d" />
                                <Text style={styles.secondaryBtnText}>New Calendar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                activeOpacity={0.7}
                                onPress={() => setImportModalVisible(true)}
                            >
                                <Ionicons name="download-outline" size={18} color="#10464d" />
                                <Text style={styles.secondaryBtnText}>Import Calendar</Text>
                            </TouchableOpacity>

                        </View>
                    )}
                </View>

                <View style={styles.headerBlock}>
                    <CalendarHeader
                        monthLabel={getHeaderLabel()}
                        onPrevMonth={goToPrev}
                        onNextMonth={goToNext}
                        onTodayPress={goToToday}
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                    />
                </View>

                <View style={styles.filterBlock}>
                    <EventFilterBar selected={selectedEventType} onChange={setSelectedEventType} />
                    <LabelFilterBar
                        labels={labelCatalog}
                        selected={selectedLabelId}
                        onChange={setSelectedLabelId}
                        onManage={() => setLabelManagerVisible(true)}
                    />
                </View>

                {/* MOBILE: inline add-event banner, sits above the grid inside the scroll */}
                {!isDesktop && selectedDay && (
                    <TouchableOpacity
                        style={styles.mobileBanner}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/create_events?date=${selectedDay}&calendarId=${selectedCalendarId ?? ''}`)}
                    >
                        <Text style={styles.mobileBannerDate}>
                            {formatSelectedDay(selectedDay)}
                        </Text>
                        <View style={styles.mobileBannerBtn}>
                            <Text style={styles.mobileBannerBtnText}>＋ Add Event</Text>
                        </View>
                    </TouchableOpacity>
                )}
                <View style={styles.container}
                    id="calendar-web"
                    ref={calendarRef}>
                    {viewMode === 'week' && (
                        <CalendarWeekGrid
                            year={year}
                            month={month}
                            day={weekDay}
                            events={filteredEvents}
                            onEventPress={setActiveEvent}
                            selectedDay={selectedDay}
                            onDayPress={handleDayPress}
                        />
                    )}
                    {viewMode === 'month' && (
                        <CalendarGrid
                            year={year}
                            month={month}
                            events={filteredEvents}
                            onEventPress={setActiveEvent}
                            selectedDay={selectedDay}
                            onDayPress={handleDayPress}
                        />
                    )}
                    {viewMode === 'year' && (
                        <CalendarYearGrid
                            year={year}
                            events={filteredEvents}
                            onMonthPress={(m) => {
                                setMonth(m);
                                setViewMode('month');
                            }}
                            onDayPress={handleDayPress}
                        />
                    )}
                </View>
                <EventDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
                <CalendarInfoModal
                    calendar={infoCalendar}
                    onClose={() => setInfoCalendar(null)}
                    onDelete={handleDeleteCalendar}
                    onEdit={(calendar) => {
                        setInfoCalendar(null);
                        router.push({
                            pathname: '/(tabs)/edit',
                            params: {
                                id: calendar.id,
                                name: calendar.name,
                                description: calendar.description ?? '',
                                privacy: calendar.privacy,
                                cover: calendar.cover ?? '',
                            },
                        });
                    }}
                    isDeleting={Boolean(infoCalendar && deletingCalendarId === infoCalendar.id)}
                />
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
                                {selectedDay ? formatSelectedDay(selectedDay) : ""}
                            </Text>
                        </View>

                        {eventsOfSelectedDay.length > 0 && (
                            <ScrollView
                                style={styles.dayEventsList}
                                contentContainerStyle={{ paddingBottom: 6 }}
                            >
                                {eventsOfSelectedDay.map((event) => (
                                    <TouchableOpacity
                                        key={event.id}
                                        style={styles.dayEventItem}
                                        onPress={() => setActiveEvent(event)}
                                    >
                                        <Text style={styles.dayEventTime}>
                                            {event.time?.slice(0, 5)}
                                        </Text>

                                        <Text style={styles.dayEventTitle}>
                                            {event.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={styles.addButton}
                            activeOpacity={0.85}
                            onPress={() =>
                                router.push(`/create_events?date=${selectedDay}&calendarId=${selectedCalendarId ?? ""}`)
                            }
                        >
                            <Text style={styles.addButtonIcon}>＋</Text>
                            <Text style={styles.addButtonLabel}>Add Event</Text>
                        </TouchableOpacity>

                    </View>
                </Animated.View>
            )}
            {isDesktop && !selectedDay && optionAnimations.map((anim, index) => {
                const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
                const opacity = anim;
                const fabBottom = isDesktop ? 30 : BOTTOM_BAR_HEIGHT;
                const isCalendar = index === 1;
                const text = isCalendar ? "Export calendar" : "Download as PNG";
                const onPress = isCalendar ? exportCalendar : exportPng;

                return (
                    <Animated.View
                        key={index}
                        style={{
                            position: "absolute",
                            bottom: fabBottom + 60 + index * 45,
                            right: 20,
                            opacity,
                            transform: [{ translateY }],
                        }}
                        pointerEvents={open && !selectedDay ? "auto" : "none"}
                    >
                        <Pressable style={styles.option} onPress={onPress}>
                            <Text style={styles.optionText}>{text}</Text>
                        </Pressable>
                    </Animated.View>
                );
            })}
            <Pressable style={[styles.fab, { bottom: isDesktop ? 30 : BOTTOM_BAR_HEIGHT, },]} onPress={toggleMenu}>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                    <MaterialCommunityIcons name="arrow-down-thick" size={28} color="white" />
                </Animated.View>
            </Pressable>
            {isDesktop && !selectedDay && (
                <Pressable style={[styles.fab, { bottom: isWeb ? 30 : 90 }]} onPress={toggleMenu}>
                    <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                        <MaterialCommunityIcons name="arrow-down-thick" size={28} color="white" />
                    </Animated.View>
                </Pressable>
            )}
            <LabelManagerModal
                visible={labelManagerVisible}
                labels={labelCatalog}
                customLabels={customLabels}
                palette={colorPalette}
                onCreate={addCustomLabel}
                onDelete={removeCustomLabel}
                onClose={() => setLabelManagerVisible(false)}
            />
            <ImportCalendarModal
                visible={importModalVisible}
                onClose={() => setImportModalVisible(false)}
                onSuccess={fetchData}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        overflow: 'visible',
    },
    container: {
        flex: 1,
        overflow: 'visible',
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
        gap: 12,
        flexWrap: 'wrap',
        overflow: 'visible',
        zIndex: 999,
    },
    toolbarButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        overflow: 'visible',
        zIndex: 999,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#10464d',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    primaryBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#10464d',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    secondaryBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10464d',
    },
    headerBlock: {
        marginBottom: 12,
    },
    filterBlock: {
        marginBottom: 8,
        gap: 8,
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
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 10,
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
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 55,
        height: 55,
        borderRadius: 30,
        backgroundColor: "#10464d",
        justifyContent: "center",
        alignItems: "center",
        elevation: 10,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    menu: {
        position: "absolute",
        bottom: 100,
        right: 20,
        alignItems: "flex-end",
    },
    option: {
        backgroundColor: "#fffded",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 10,
        minWidth: 180,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    optionText: {
        fontSize: 16,
        color: "#10464d",
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
    dayEventsList: {
        marginTop: 12,
        maxHeight: 120,
    },

    dayEventItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 6,
    },

    dayEventTime: {
        fontWeight: "700",
        color: "#10464d",
        fontSize: 13,
    },

    dayEventTitle: {
        color: "#10464d",
        fontSize: 13,
    },

    importDropdown: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#10464d',
        padding: 8,
        zIndex: 999,
        minWidth: 220,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    importOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 10,
    },
    importIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#10464d',
    },
    importOptionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10464d',
    },
    importOptionDesc: {
        fontSize: 12,
        color: '#10464d',
        opacity: 0.6,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalCard: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 16,
        backgroundColor: '#fffded',
        overflow: 'hidden',
        elevation: 5,
    },
    modalHeader: {
        backgroundColor: '#10464d',
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    modalHeaderText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    modalBody: {
        padding: 20,
    },
    modalInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#10464d',
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#fcfcfc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10464d',
    },
    submitButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#10464d',
        borderRadius: 12,
    },
});
