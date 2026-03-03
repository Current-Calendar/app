import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CalendarGrid } from "@/components/calendar-grid";
import { CalendarHeader } from "@/components/calendar-header";
import { EventDetailModal } from "@/components/event-detail-modal";
import { MOCK_CALENDARS, MOCK_EVENTS } from "@/constants/mock-data";
import { CalendarEvent } from "@/types/calendar";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatSelectedDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAY_NAMES[date.getDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export default function CalendarViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();

  const calendarId = Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId;
  const calendar = useMemo(
    () => MOCK_CALENDARS.find((c) => c.id === calendarId) ?? MOCK_CALENDARS[0],
    [calendarId]
  );

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const events = useMemo(
    () => MOCK_EVENTS.filter((event) => event.calendarId === calendar.id),
    [calendar.id]
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
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{calendar.nombre}</Text>
          <Text style={styles.subtitle}>by {calendar.creador}</Text>
        </View>

        <View style={styles.headerBlock}>
          <CalendarHeader
            monthLabel={`${MONTH_NAMES[month]} ${year}`}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            onTodayPress={goToToday}
          />
        </View>

        {selectedDay && (
          <TouchableOpacity
            style={styles.mobileBanner}
            activeOpacity={0.85}
            onPress={() => router.push(`/create_events?date=${selectedDay}&calendarId=${calendar.id}`)}
          >
            <Text style={styles.mobileBannerDate}>{formatSelectedDay(selectedDay)}</Text>
            <View style={styles.mobileBannerBtn}>
              <Text style={styles.mobileBannerBtnText}>＋ Add Event</Text>
            </View>
          </TouchableOpacity>
        )}

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

      <EventDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "#FFFDED",
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