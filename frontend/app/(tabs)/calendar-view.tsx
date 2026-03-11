import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { CalendarGrid } from "@/components/calendar-grid";
import { CalendarHeader } from "@/components/calendar-header";
import { PublicEventDetailModal } from "@/components/public-event-detail-modal";
import { CalendarEvent } from "@/types/calendar";
import { useCalendars } from "@/hooks/use-calendars";
import { useEventsList } from "@/hooks/use-events";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();

  const calendarId = Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId;
  const { calendars: backendCalendars } = useCalendars();

  const {
    events: backendEvents,
    loading: loadingEvents,
    refetch: refetchEvents,
  } = useEventsList();

  const calendar = useMemo(
    () => {
      const found = backendCalendars.find((c) => String(c.id) === calendarId);
      return found || backendCalendars[0] || null;
    },
    [calendarId, backendCalendars]
  );

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  // Load events when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refetchEvents();
    }, [refetchEvents])
  );

  // Transform and filter events by selected calendar
  const events = useMemo(
    () => {
      if (loadingEvents || !calendar) return [];

      const transformed: CalendarEvent[] = [];
      backendEvents.forEach((evt: any) => {
        if (evt.calendars && evt.calendars.length > 0) {
          evt.calendars.forEach((calId: number) => {
            transformed.push({
              id: String(evt.id),
              calendarId: String(calId),
              title: evt.title,
              description: evt.description,
              place_name: evt.place_name,
              date: evt.date,
              time: evt.time,
              recurrence: evt.recurrence,
              photo: evt.photo,
              color: undefined,
            });
          });
        }
      });

      return transformed.filter((event) => String(event.calendarId) === String(calendar.id));
    },
    [calendar, backendEvents, loadingEvents]
  );

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
      {!calendar ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No calendar found</Text>
          <Text style={styles.emptyText}>Please select a calendar to view</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push("/switch-calendar")}>
            <Text style={styles.primaryButtonText}>Select Calendar</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.title}>{calendar.name}</Text>
            <Text style={styles.subtitle}>by {calendar.creator?.username || calendar.creator || 'Unknown'}</Text>
          </View>

        <View style={styles.headerBlock}>
          <CalendarHeader
            monthLabel={`${MONTH_NAMES[month]} ${year}`}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            onTodayPress={goToToday}
          />
        </View>

        <View style={styles.gridWrap}>
          <CalendarGrid
            year={year}
            month={month}
            events={events}
            onEventPress={setActiveEvent}
            selectedDay={selectedDay}
            onDayPress={setSelectedDay}
          />
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryButton} onPress={() => router.push("/switch-calendar")}>
            <Text style={styles.secondaryButtonText}>Back to calendars</Text>
          </Pressable>
        </View>
      </ScrollView>
      )}

      {calendar && <PublicEventDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "#FFFDED",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#10464d",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#5E6E6E",
    marginBottom: 24,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#10464d",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFDED",
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 18,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#10464d",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#5E6E6E",
    fontWeight: "600",
  },
  headerBlock: {
    marginBottom: 10,
  },
  mobileBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#10464d",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mobileBannerDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10464d",
    flex: 1,
    marginRight: 10,
  },
  mobileBannerBtn: {
    backgroundColor: "#10464d",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  mobileBannerBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  gridWrap: {
    flex: 1,
    minHeight: 520,
  },
  actionsRow: {
    marginTop: 14,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#10464d",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: "#10464d",
    fontWeight: "700",
    fontSize: 13,
  },
});