import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, } from 'react-native';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarGrid } from '@/components/calendar-grid';
import { CalendarHeader } from '@/components/calendar-header';
import { CalendarInfoModal } from '@/components/calendar-info-modal';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CalendarSelector } from '@/components/calendar-selector';
import { EventDetailModal } from '@/components/event-detail-modal';
import { EventFilterBar } from '@/components/event-filter-bar';

import { Calendar, CalendarEvent, EventType } from '@/types/calendar';

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { toPng } from "html-to-image";
import { captureRef } from "react-native-view-shot";

import { API_CONFIG } from '@/constants/api';
import { downloadCalendar } from '@/services/calendarService';

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
    const [calendars, setCalendars] = useState<Calendar[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<any>();
    const isWeb = Platform.OS === "web";

    const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
    const [infoCalendar, setInfoCalendar] = useState<Calendar | null>(null);
    const [deletingCalendarId, setDeletingCalendarId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [calRes, evRes] = await Promise.all([
                    fetch(API_CONFIG.endpoints.getCalendars),
                    fetch(API_CONFIG.endpoints.getEvents),
                ]);

                if (!calRes.ok || !evRes.ok) {
                    throw new Error('Failed to fetch data');
                }

                const calData = await calRes.json();
                const evData = await evRes.json();

                const COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB84C', '#FF9F43', '#00CFE8'];

                const mappedCalendars: Calendar[] = calData.map((c: any, index: number) => ({
                    id: String(c.id),
                    nombre: c.nombre,
                    descripcion: c.descripcion || '',
                    estado: c.estado,
                    origen: c.origen,
                    creador: c.creador_username || 'unknown',
                    color: COLORS[index % COLORS.length],
                }));

                const mappedEvents: CalendarEvent[] = evData.map((e: any) => {
                    const calendar = mappedCalendars.find(c => e.calendarios.includes(Number(c.id)));
                    return {
                        id: String(e.id),
                        calendarId: String(e.calendarios[0] || ''),
                        titulo: e.titulo,
                        descripcion: e.descripcion || '',
                        nombre_lugar: e.nombre_lugar || '',
                        fecha: e.fecha,
                        hora: e.hora.substring(0, 5),
                        recurrencia: e.recurrencia,
                        type: 'other', // Default type
                        color: calendar?.color || '#6C63FF',
                    };
                });

                setCalendars(mappedCalendars);
                setEvents(mappedEvents);
            } catch (error) {
                console.error('Error fetching data:', error);
                Alert.alert('Error', 'Could not load calendars or events.');
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, []);

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
                credentials: 'include',
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
    // Added loading para esperar a datos
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

    // TODO BACKEND - Descomentar una vez se tengan calendarios reales
    const exportarCalendar = async () => {
        try {
            const fileUri = await downloadCalendar(selectedCalendarId!);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri!);
            } else {
                alert("Archivo guardado en: " + fileUri);
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
                                onPress={() => router.push(`/create_events?date=${selectedDay || ''}&calendarId=${selectedCalendarId || ''}`)}
                            >
                                <Ionicons name="add" size={18} color="#fff" />
                                <Text style={styles.primaryBtnText}>New Event</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                activeOpacity={0.7}
                                onPress={() => router.push('/modal')}
                            >
                                <Ionicons name="calendar-outline" size={18} color="#10464d" />
                                <Text style={styles.secondaryBtnText}>New Calendar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
                <CalendarGrid
                    year={year}
                    month={month}
                    events={filteredEvents}
                    onEventPress={setActiveEvent}
                    selectedDay={selectedDay}
                    onDayPress={handleDayPress}
                />
                </View>
                <EventDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
                <CalendarInfoModal
                    calendar={infoCalendar}
                    onClose={() => setInfoCalendar(null)}
                    onDelete={handleDeleteCalendarPress}
                    onEdit={(calendar) => {
                        setInfoCalendar(null);
                        router.push({
                            pathname: '/(tabs)/edit',
                            params: {
                                id: calendar.id,
                                nombre: calendar.nombre,
                                descripcion: calendar.descripcion ?? '',
                                estado: calendar.estado,
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
                                {selectedDay ? formatSelectedDay(selectedDay) : ''}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.addButton}
                            activeOpacity={0.85}
                            onPress={() => router.push(`/create_events?date=${selectedDay}&calendarId=${selectedCalendarId ?? ''}`)}
                        >
                            <Text style={styles.addButtonIcon}>＋</Text>
                            <Text style={styles.addButtonLabel}>Add Event</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
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
        gap: 12,
        flexWrap: 'wrap',
    },
    toolbarButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
});
