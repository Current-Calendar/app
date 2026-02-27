import React, { useMemo, useRef, useState } from 'react';
import { Alert, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';


import { CalendarGrid } from '@/components/calendar-grid';
import { CalendarHeader } from '@/components/calendar-header';
import { CalendarInfoModal } from '@/components/calendar-info-modal';
import { CalendarSelector } from '@/components/calendar-selector';
import { EventDetailModal } from '@/components/event-detail-modal';
import { EventFilterBar } from '@/components/event-filter-bar';

import { MOCK_CALENDARS, MOCK_EVENTS } from '@/constants/mock-data';
import { Calendar, CalendarEvent, EventType } from '@/types/calendar';

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { toPng } from "html-to-image";
import { captureRef } from "react-native-view-shot";

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
    const isWeb = Platform.OS === "web";

    const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
    const [infoCalendar, setInfoCalendar] = useState<Calendar | null>(null);
    const [deletingCalendarId, setDeletingCalendarId] = useState<string | null>(null);

    const [open, setOpen] = useState(false);
    const rotation = useRef(new Animated.Value(0)).current;
    const calendarRef = useRef<View>(null);

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

    const optionAnimations = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

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

    // TODO BACKEND - Descomentar una vez se tengan calendarios reales
    const exportarCalendar = async () => {
        try {
            //const fileUri = await downloadCalendar(selectedCalendarId);

            if (await Sharing.isAvailableAsync()) {
                //await Sharing.shareAsync(fileUri);
            } else {
                //alert("Archivo guardado en: " + fileUri);
            }
        } catch (error) {
            alert("No se pudo descargar correctamente el calendario. ")
            console.log(error)
        }
    }

    const exportarPng = async () => {
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
                    alert("Imagen guardada en: " + uri);
                }
            }
        } catch (error) {
            console.error(error);
            alert("No se pudo exportar el calendario como PNG");
        }
    }

    return (
        <View style={styles.container}>
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

                <View style={styles.filterBlock}>
                    <EventFilterBar selected={selectedEventType} onChange={setSelectedEventType} />
                </View>
                <View
                    id="calendar-web"
                    ref={calendarRef}
                    style={styles.container}>
                    <CalendarGrid
                        year={year}
                        month={month}
                        events={filteredEvents}
                        onEventPress={setActiveEvent}
                    />
                </View>

                <EventDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
                <CalendarInfoModal calendar={infoCalendar} onClose={() => setInfoCalendar(null)} />
            </ScrollView>
            {optionAnimations.map((anim, index) => {
                const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
                const opacity = anim;
                const fabBottom = Platform.OS === "web" ? 30 : 90;
                const isCalendar = index === 1;
                const text = isCalendar ? "Exportar calendario" : "Descargar como PNG";
                const onPress = isCalendar ? exportarCalendar : exportarPng;

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
                        pointerEvents={open ? "auto" : "none"}
                    >
                        <Pressable style={styles.option} onPress={onPress}>
                            <Text style={styles.optionText}>{text}</Text>
                        </Pressable>
                    </Animated.View>
                );
            })}
            <Pressable style={[styles.fab, { bottom: isWeb ? 30 : 90, },]} onPress={toggleMenu}>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                    <MaterialCommunityIcons name="arrow-down-thick" size={28} color="white" />
                </Animated.View>
            </Pressable>
        </View>
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
});
