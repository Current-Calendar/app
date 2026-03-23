import React, { useMemo, useState,useEffect, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import apiClient from "@/services/api-client";

import { CalendarGrid } from "@/components/calendar-grid";
import { CalendarHeader } from "@/components/calendar-header";
import { PublicEventDetailModal } from "@/components/public-event-detail-modal";
import { CalendarEvent } from "@/types/calendar";
import { useCalendars } from "@/hooks/use-calendars";
import { useEventsList } from "@/hooks/use-events";
import { ReportModal } from "@/components/report-modal";
import { useEventLabels } from "@/hooks/use-event-labels";
import { LabelChip } from "@/components/label-chip";
import { LabelManagerModal } from "@/components/label-manager-modal";
import { useAuth } from "@/hooks/use-auth";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const normalizeLabelName = (name: string) => {
  const trimmed = name?.trim() || '';
  if (!trimmed) return '';
  return trimmed.slice(0, 1).toUpperCase() + trimmed.slice(1).toLowerCase();
};

export default function CalendarViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ calendarId?: string | string[] }>();
  const calendarId = Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId;
  const { calendars: backendCalendars } = useCalendars();
  const { events: backendEvents, loading: loadingEvents, refetch: refetchEvents } = useEventsList();
  const {
    labels,
    addLabelToCalendar,
    removeLabelFromCalendar,
    addCustomLabel,
    removeCustomLabel,
    colorPalette,
  } = useEventLabels();
  const { user } = useAuth();
  const [fetchedAssignmentsFor, setFetchedAssignmentsFor] = useState<string | null>(null);
  const normalizeLabel = useCallback((raw: any) => {
    if (!raw) return null;
    const idCandidate = raw.id ?? raw.label_id ?? raw.label ?? raw;
    const nameCandidate = raw.name ?? (typeof raw === 'string' ? raw : '');
    const idStr = String(idCandidate ?? '').trim();
    const matchById = labels.find((l) => String(l.id) === idStr);
    const matchByName = labels.find(
      (l) => l.name && nameCandidate && l.name.toLowerCase() === String(nameCandidate).toLowerCase()
    );
    const resolved = matchById ?? matchByName;
    if (!resolved) return null;
    return {
      id: String(resolved.id),
      name: resolved.name,
      color: resolved.color ?? raw.color ?? '#10464d',
      is_default: resolved.is_default ?? resolved.isDefault ?? raw.is_default ?? raw.isDefault,
    };
  }, [labels]);

  const calendar = useMemo(() => {
    const found = backendCalendars.find((c) => String(c.id) === calendarId);
    return found || backendCalendars[0] || null;
  }, [calendarId, backendCalendars]);
  const [localLabels, setLocalLabels] = useState<any[]>([]);
  useEffect(() => {
    const loadFromCalendar = () => {
      if (Array.isArray(calendar?.labels)) {
        const normalized = calendar.labels
          .map((l: any) => normalizeLabel(l))
          .filter(Boolean) as any[];
        if (normalized.length > 0) {
          setLocalLabels(normalized);
          setFetchedAssignmentsFor(String(calendar?.id));
          return true;
        }
      }
      return false;
    };

    // Try direct data first
    const hasLocal = loadFromCalendar();
    if (hasLocal) return;

    // Fallback: fetch assignments via backend filter endpoint
    if (!calendar || labels.length === 0) return;
    if (fetchedAssignmentsFor === String(calendar.id)) return;

    let cancelled = false;
    const fetchAssignments = async () => {
      const matches: any[] = [];
      for (const label of labels) {
        const norm = normalizeLabelName(label.name);
        if (!norm) continue;
        try {
          const resp = await apiClient.get<any>(`/calendars/filter-by-label/?label=${encodeURIComponent(norm)}`);
          const list = Array.isArray(resp)
            ? resp
            : Array.isArray(resp?.results)
              ? resp.results
              : Array.isArray(resp?.calendars)
                ? resp.calendars
                : [];
          const contains = list.some((c: any) => String(c.id) === String(calendar.id));
          if (contains) {
            matches.push({
              id: String(label.id),
              name: label.name,
              color: label.color,
              is_default: label.is_default ?? label.isDefault,
            });
          }
        } catch (err) {
          console.error('Error fetching calendar label assignments', err);
        }
      }
      if (!cancelled) {
        setFetchedAssignmentsFor(String(calendar.id));
        setLocalLabels(matches);
      }
    };
    void fetchAssignments();

    return () => {
      cancelled = true;
    };
  }, [calendar, labels, normalizeLabel, fetchedAssignmentsFor]);
  const assignedLabelIds = useMemo(
    () => new Set(localLabels.map((l: any) => String(l.id))),
    [localLabels]
  );
  const isOwner = useMemo(() => {
    const currentUsername = user?.username || (user as any)?.user?.username;
    const calendarUsername = (calendar as any)?.creator_username || (calendar as any)?.creator || '';
    const currentId = user?.id || (user as any)?.user?.id;
    const calendarCreatorId = (calendar as any)?.creator_id;
    if (currentUsername && calendarUsername && String(currentUsername) === String(calendarUsername)) return true;
    if (currentId != null && calendarCreatorId != null && String(currentId) === String(calendarCreatorId)) return true;
    return false;
  }, [calendar, user]);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [labelManagerVisible, setLabelManagerVisible] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: number; type: 'CALENDAR' | 'EVENT'; label?: string } | null>(null);

  useFocusEffect(
    React.useCallback(() => { refetchEvents(); }, [refetchEvents])
  );

  const events = useMemo(() => {
    if (loadingEvents || !calendar) return [];
    const transformed: CalendarEvent[] = [];
    backendEvents.forEach((evt: any) => {
      if (evt.calendars?.length) {
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
    return transformed.filter((e) => String(e.calendarId) === String(calendar.id));
  }, [calendar, backendEvents, loadingEvents]);

  const eventsOfSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter((event) => event.date?.slice(0,10) === selectedDay);
  }, [events, selectedDay]);

  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  function formatSelectedDay(dateKey: string): string {
    const [y,m,d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return `${DAY_NAMES[date.getDay()]}, ${d} ${MONTH_NAMES[m-1]} ${y}`;
  }

  const goToPrevMonth = () => { setMonth((m) => (m === 0 ? 11 : m - 1)); setYear((y) => (month === 0 ? y - 1 : y)); };
  const goToNextMonth = () => { setMonth((m) => (m === 11 ? 0 : m + 1)); setYear((y) => (month === 11 ? y + 1 : y)); };
  const goToToday = () => { const now = new Date(); setYear(now.getFullYear()); setMonth(now.getMonth()); };

  const openReport = (id: number, type: 'CALENDAR' | 'EVENT', label?: string) => {
    setReportTarget({ id, type, label });
    setReportOpen(true);
  };

  return (
    <View style={styles.screenWrapper}>
      {!calendar ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading calendar...</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

          <View style={styles.topRow}>
            <Text style={styles.title}>{calendar.name}</Text>
            <Pressable
              style={styles.reportBtn}
              onPress={() => openReport(calendar.id, 'CALENDAR', calendar.name)}
            >
              <Text style={styles.reportBtnText}>Report</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>by {calendar.creator?.username || calendar.creator || 'Unknown'}</Text>

          <View style={styles.labelsRow}>
            <Text style={styles.labelsTitle}>Labels</Text>
            {isOwner && (
              <Pressable style={styles.manageBtn} onPress={() => setLabelManagerVisible(true)} hitSlop={8}>
                <Text style={styles.manageText}>Manage</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.labelsChips}>
            {labels.length === 0 && (
              <Text style={styles.helperText}>{isOwner ? 'No labels yet, add one.' : 'No labels.'}</Text>
            )}
            {labels.map((label) => {
              const selected = assignedLabelIds.has(String(label.id));
              return (
                <LabelChip
                  key={label.id}
                  label={label}
                  selected={selected}
                  compact
                  disabled={!isOwner}
                  onPress={
                    isOwner
                      ? () => {
                          const id = String(label.id);
                          if (selected) {
                            removeLabelFromCalendar(calendar.id, id);
                            setLocalLabels((prev) =>
                              prev.filter((l: any) => String(l.id) !== id)
                            );
                          } else {
                            addLabelToCalendar(calendar.id, id);
                            setLocalLabels((prev) => [
                              ...prev,
                              {
                                id,
                                name: label.name,
                                color: label.color,
                                is_default: label.is_default ?? label.isDefault,
                              },
                            ]);
                          }
                        }
                      : undefined
                  }
                />
              );
            })}
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
            <Pressable style={styles.secondaryButton} onPress={() => router.push("/switch-calendar")}>
              <Text style={styles.secondaryButtonText}>Back to calendars</Text>
            </Pressable>
          </View>

          {calendar && activeEvent && (
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

          {isOwner && (
            <LabelManagerModal
              visible={labelManagerVisible}
              labels={labels}
              customLabels={labels.filter((l) => !l.is_default && !l.isDefault)}
              palette={colorPalette}
              onCreate={(name, color) => addCustomLabel(name, color, { type: 'calendar', id: calendar?.id || '' })}
              onDelete={(id) => removeCustomLabel(id, { type: 'calendar', id: calendar?.id || '' })}
              onClose={() => setLabelManagerVisible(false)}
            />
          )}

        </ScrollView>
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
  labelsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  labelsTitle: { color: "#10464d", fontWeight: "800", fontSize: 14 },
  labelsChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  helperText: { color: "#10464d", opacity: 0.7, fontWeight: "700" },
  manageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#10464d",
    backgroundColor: "rgba(31,106,106,0.1)",
  },
  manageText: { color: "#10464d", fontWeight: "800", fontSize: 12 },
  headerBlock: {
    marginBottom: 10,
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
