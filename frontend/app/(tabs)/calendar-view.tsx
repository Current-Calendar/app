import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { CalendarGrid } from "@/components/calendar-grid";
import { CalendarHeader } from "@/components/calendar-header";
import { PublicEventDetailModal } from "@/components/public-event-detail-modal";
import { CalendarEvent } from "@/types/calendar";
import { useAuth } from "@/hooks/use-auth";
import InviteUserModal from "@/components/InviteUserModal";
import { ReportModal } from "@/components/report-modal";
import { useCalendarQuery } from "@/hooks/querys/use-calendar-query";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function formatSelectedDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAY_NAMES[date.getDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export default function CalendarViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ calendarId?: string | string[]; eventId?: string | string[] }>();

  const calendarId = Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId;
  const eventId    = Array.isArray(params.eventId)    ? params.eventId[0]    : params.eventId;

  const { user } = useAuth();

  const { calendar, events: rawEvents, loading, error, notFound, reload } =
    useCalendarQuery(calendarId);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay]                     = useState<string | null>(null);
  const [activeEvent, setActiveEvent]                     = useState<CalendarEvent | null>(null);
  const [openedEventFromParams, setOpenedEventFromParams] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [reportOpen, setReportOpen]       = useState(false);
  const [reportTarget, setReportTarget]   = useState<{ id: number; type: 'CALENDAR' | 'EVENT'; label?: string } | null>(null);

  const events = useMemo<CalendarEvent[]>(() => {
    if (!calendarId) return [];
    const result: CalendarEvent[] = [];
    rawEvents.forEach((evt) => {
      if (!evt.calendarIds?.length) return;
      evt.calendarIds.forEach((calId: string | number) => {
        const rawEnd = evt.endDate;
        const cleanEnd = rawEnd ? (rawEnd.includes("T") ? rawEnd.split("T")[0] : rawEnd) : undefined;
        result.push({
          id: String(evt.id),
          calendarId: String(calId),
          title: evt.title,
          description: evt.description ?? '',
          place_name: evt.placeName ?? '',
          date: evt.date,
          end_date: cleanEnd,
          time: evt.time ?? '',
          end_time: evt.endTime ? evt.endTime.substring(0, 5) : undefined,
          recurrence: evt.recurrence,
          photo: evt.photo,
          color: undefined,
          show_time: !cleanEnd || cleanEnd === evt.date,
        });
      });
    });
    return result.filter((e) => String(e.calendarId) === String(calendarId));
  }, [rawEvents, calendarId]);

  const isOwner = useMemo(() => {
    if (!calendar || !user) return false;
    return calendar.creatorUsername === user.username || String(calendar.creatorId) === String(user.id);
  }, [calendar, user]);

  const eventsOfSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter((event) => event.date?.slice(0, 10) === selectedDay);
  }, [events, selectedDay]);

  useEffect(() => {
    setOpenedEventFromParams(false);
  }, [eventId]);

  useEffect(() => {
    if (!eventId || openedEventFromParams) return;
    if (loading || events.length === 0) return;

    const matchedEvent = events.find((e) => String(e.id) === String(eventId));
    if (!matchedEvent) {
      setOpenedEventFromParams(true);
      return;
    }

    setSelectedDay(matchedEvent.date?.slice(0, 10) ?? null);
    setActiveEvent(matchedEvent);
    setOpenedEventFromParams(true);
  }, [eventId, events, loading, openedEventFromParams]);

  const goToPrevMonth = () => { setMonth((m) => (m === 0 ? 11 : m - 1)); setYear((y) => (month === 0 ? y - 1 : y)); };
  const goToNextMonth = () => { setMonth((m) => (m === 11 ? 0  : m + 1)); setYear((y) => (month === 11 ? y + 1 : y)); };
  const goToToday    = () => { const now = new Date(); setYear(now.getFullYear()); setMonth(now.getMonth()); };

  const openReport = (id: number, type: 'CALENDAR' | 'EVENT', label?: string) => {
    setReportTarget({ id, type, label });
    setReportOpen(true);
  };

  if (notFound) {
    return (
      <View style={styles.screenWrapper}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>This calendar no longer exists or is not accessible.</Text>
          <Pressable style={[styles.secondaryButton, { marginTop: 16 }]} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading || !calendar) {
    return (
      <View style={styles.screenWrapper}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error ?? "Loading calendar..."}</Text>
          {error && (
            <Pressable style={[styles.secondaryButton, { marginTop: 16 }]} onPress={reload}>
              <Text style={styles.secondaryButtonText}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenWrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

        <View style={styles.topRow}>
          <Text style={styles.title}>{calendar.name}</Text>
          <Pressable style={styles.reportBtn} onPress={() => openReport(Number(calendar.id), 'CALENDAR', calendar.name)}>
            <Text style={styles.reportBtnText}>Report</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>by {calendar.creatorUsername || 'Unknown'}</Text>

        <View style={styles.backButtonWrap}>
          <Pressable style={styles.secondaryButton} onPress={() => router.push("/switch-calendar")}>
            <Text style={styles.secondaryButtonText}>Back to calendars</Text>
          </Pressable>
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

        {selectedDay && (
          <View style={styles.dayEventsContainer}>
            <Text style={styles.dayEventsTitle}>{formatSelectedDay(selectedDay)}</Text>
            {eventsOfSelectedDay.length === 0 ? (
              <Text style={styles.noEventsText}>No events this day</Text>
            ) : (
              eventsOfSelectedDay.map((event) => (
                <TouchableOpacity key={event.id} style={styles.dayEventItem} onPress={() => setActiveEvent(event)}>
                  <Text style={styles.dayEventTime}>{event.time}</Text>
                  <Text style={styles.dayEventTitle}>{event.title}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={styles.actionsRow}>
          {isOwner && (
            <Pressable style={styles.inviteButton} onPress={() => setInviteVisible(true)}>
              <Text style={styles.secondaryButtonText}>Invite to calendar</Text>
            </Pressable>
          )}
        </View>

        {activeEvent && (
          <PublicEventDetailModal
            event={activeEvent}
            onClose={() => setActiveEvent(null)}
            onReport={() => openReport(Number(activeEvent.id), 'EVENT', activeEvent.title)}
          />
        )}

        {reportOpen && reportTarget && (
          <ReportModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            reportedType={reportTarget.type}
            reportedId={reportTarget.id}
            reportedLabel={reportTarget.label}
          />
        )}

      </ScrollView>

      {isOwner && (
        <InviteUserModal
          visible={inviteVisible}
          onClose={() => setInviteVisible(false)}
          itemId={String(calendar.id)}
          type="calendar"
          hideUsers={calendar.co_owners?.map((u: { id: number; }) => u.id) || []}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    color: "#5E6E6E",
    textAlign: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 18,
    marginBottom: 4,
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
    paddingHorizontal: 16,
  },
  backButtonWrap: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  reportBtn: {
    backgroundColor: "#10464d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reportBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  headerBlock: {
    marginBottom: 10,
  },
  gridWrap: {
    flex: 1,
    minHeight: 520,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#10464d",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inviteButton: {
    backgroundColor: "#EAF7F6",
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
  dayEventsContainer: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  dayEventsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10464d",
    marginBottom: 8,
  },
  dayEventItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(16,70,77,0.2)",
  },
  dayEventTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10464d",
  },
  dayEventTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10464d",
  },
  noEventsText: {
    color: "#5E6E6E",
    fontSize: 13,
  },
});