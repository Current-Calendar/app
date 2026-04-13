import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  Platform,
  Modal,
  FlatList,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useCreateEventApi } from "@/hooks/use-create-event-api";
import { usePlaceSearch, PlaceSuggestion } from "@/hooks/use-place-search";
import { useRouter } from "expo-router";
import apiClient, { appendPhoto } from "@/services/api-client";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

const BG = "#E8E5D8";
const TEXT = "#10464D";
const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const WHITE = "#FFFFFF";
const RED = "#FF3B30";

const PLACE_DEBOUNCE_MS = 350;

type CalendarItem = { id: string; name: string; image?: any };

type EventTagItem = {
  id: number;
  name: string;
  category: number;
  category_name?: string;
  events_count?: number;
};

type ApiListResponse<T> = T[] | { results?: T[]; data?: T[] };

const extractArray = <T,>(response: ApiListResponse<T> | null | undefined): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toHM = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const toHMS = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;

const mapCalendarFromApi = (raw: any): CalendarItem => ({
  id: String(raw?.id ?? raw?.pk ?? ""),
  name: String(raw?.name ?? raw?.title ?? "Calendar"),
});

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type MiniMonthCalendarProps = {
  value: Date;
  onChange: (d: Date) => void;
  size?: number;
};

function MiniMonthCalendar({ value, onChange, size = 260 }: MiniMonthCalendarProps) {
  const selected = startOfDay(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    setViewYear(selected.getFullYear());
    setViewMonth(selected.getMonth());
  }, [selected.getFullYear(), selected.getMonth()]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const firstDowMondayBased = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: { date: Date | null; label: string }[] = [];
    for (let i = 0; i < firstDowMondayBased; i++) cells.push({ date: null, label: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(viewYear, viewMonth, d), label: String(d) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, label: "" });

    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onChange(today);
  };

  const innerPad = 10;
  const headerH = 34;
  const weekdaysH = 18;
  const gridPadTop = 6;

  const rows = Math.max(1, Math.ceil(days.length / 7));
  const extraH = rows === 6 ? 16 : 0;
  const cellGapY = 2;

  const gridAvailableH = size - innerPad * 2 - headerH - weekdaysH - gridPadTop + extraH;
  const cellH = Math.floor((gridAvailableH - cellGapY * rows) / rows);
  const cellW = Math.floor((size - innerPad * 2) / 7);

  return (
    <View style={[miniStyles.card, { width: size, height: size + extraH }]}>
      <View style={miniStyles.headerRow}>
        <Pressable onPress={goPrevMonth} style={miniStyles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color={TEXT} />
        </Pressable>

        <Pressable onPress={goToday} style={miniStyles.monthPill}>
          <Text style={miniStyles.monthText}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
        </Pressable>

        <Pressable onPress={goNextMonth} style={miniStyles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={16} color={TEXT} />
        </Pressable>
      </View>

      <View style={miniStyles.weekdaysRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={`${w}-${i}`} style={[miniStyles.weekday, { width: cellW }]}>
            {w}
          </Text>
        ))}
      </View>

      <View style={[miniStyles.grid, { paddingTop: gridPadTop }]}>
        {days.map((cell, idx) => {
          const d = cell.date;
          const selectedCell = d ? isSameDay(d, selected) : false;
          const todayCell = d ? isSameDay(d, today) : false;

          return (
            <Pressable
              key={idx}
              disabled={!d}
              onPress={() => d && onChange(startOfDay(d))}
              style={[
                miniStyles.dayCell,
                { width: cellW, height: cellH },
                selectedCell && miniStyles.daySelected,
                todayCell && miniStyles.dayToday,
                !d && miniStyles.dayEmpty,
              ]}
            >
              <Text
                style={[
                  miniStyles.dayText,
                  selectedCell && miniStyles.dayTextSelected,
                  !d && miniStyles.dayTextEmpty,
                ]}
              >
                {cell.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(16,70,77,0.18)",
    backgroundColor: "rgba(255,255,255,0.45)",
    overflow: "hidden",
    padding: 8,
  },
  headerRow: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 30,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1.5,
    borderColor: "rgba(16,70,77,0.18)",
  },
  monthPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(31,106,106,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(31,106,106,0.18)",
  },
  monthText: { color: TEXT, fontWeight: "900", fontSize: 12 },
  weekdaysRow: {
    height: 18,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  weekday: {
    textAlign: "center",
    color: TEXT,
    fontWeight: "900",
    fontSize: 10,
    opacity: 0.75,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginBottom: 2,
  },
  dayEmpty: { backgroundColor: "transparent" },
  dayText: { color: TEXT, fontWeight: "900", fontSize: 11 },
  dayTextEmpty: { opacity: 0 },
  daySelected: {
    backgroundColor: "rgba(242,163,166,0.40)",
    borderWidth: 1.5,
    borderColor: PINK,
  },
  dayTextSelected: { color: TEXT },
  dayToday: { borderWidth: 1.5, borderColor: TEAL },
});

export default function CreateEventsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { loadMyCalendars, createEvent } = useCreateEventApi();
  const { date: dateParam, calendarId: calendarIdParam } = useLocalSearchParams<{
    date: string;
    calendarId: string;
  }>();
  const router = useRouter();

  const goBackOrCalendars = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace("/(tabs)/calendars");
  };

  const goToRoot = () => {
    router.replace(`/(tabs)/calendars?selectedCalendarId=${selectedCalendar?.id || ""}`);
  };

  const { width } = useWindowDimensions();
  const formWidth =
    Platform.OS === "web" ? Math.min(width * 0.58, 820) : Math.min(width * 0.92, 420);

  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);

  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarItem | null>(null);

  const [availableTags, setAvailableTags] = useState<EventTagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);

  const loadTagsForCalendar = async (calendarId: string | number) => {
    try {
      setTagsLoading(true);
      setTagsError(null);

      const response = await apiClient.get(
        `/event-tags/for-calendar/${calendarId}/`
      ) as ApiListResponse<EventTagItem>;

      const list = extractArray(response);
      setAvailableTags(list);

      setSelectedTagIds((prev) =>
        prev.filter((tagId) => list.some((tag) => tag.id === tagId))
      );
    } catch (error: any) {
      console.error("Error loading tags for calendar:", error);
      setAvailableTags([]);
      setSelectedTagIds([]);
      setTagsError(error?.message || "Error loading event labels");
    } finally {
      setTagsLoading(false);
    }
  };

  const loadCalendars = async () => {
    try {
      setCalLoading(true);
      setCalError(null);

      const data: any = await loadMyCalendars();

      const list =
        (Array.isArray(data) && data) ||
        (Array.isArray(data?.results) && data.results) ||
        (Array.isArray(data?.calendars) && data.calendars) ||
        (Array.isArray(data?.data) && data.data) ||
        [];

      const mapped = list.map(mapCalendarFromApi).filter((c: CalendarItem) => c.id);

      setCalendars(mapped);

      if (mapped.length > 0) {
        const preSelected =
          selectedCalendar ??
          (calendarIdParam
            ? mapped.find((c: CalendarItem) => c.id === String(calendarIdParam)) ?? mapped[0]
            : mapped[0]);

        setSelectedCalendar(preSelected);

        if (preSelected?.id) {
          await loadTagsForCalendar(preSelected.id);
        }
      }
    } catch (e: any) {
      setCalError(e?.message ?? "Error loading calendars");
      setCalendars([]);
      setSelectedCalendar(null);
      setAvailableTags([]);
      setSelectedTagIds([]);
    } finally {
      setCalLoading(false);
    }
  };

  useEffect(() => {
    loadCalendars();
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverAsset, setCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);

  const [placeFocused, setPlaceFocused] = useState(false);
  const keepCoordinatesOnNextPlaceChangeRef = useRef(false);

  const {
    suggestions,
    loading: placeLoading,
    error: placeError,
  } = usePlaceSearch(place, {
    enabled: placeFocused,
    delayMs: PLACE_DEBOUNCE_MS,
    limit: 6,
  });

  const [date, setDate] = useState<Date>(() => {
    if (dateParam) {
      const d = new Date(String(dateParam));
      d.setHours(0, 0, 0, 0);
      return d;
    }

    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [time, setTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return d;
  });

  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);
  const [webHour, setWebHour] = useState(time.getHours());
  const [webMinute, setWebMinute] = useState(time.getMinutes());

  const timeLabel = useMemo(() => `${toHM(time)} h`, [time]);
  const dateLabel = useMemo(() => toISODate(date), [date]);

  const openTimePicker = () => {
    if (Platform.OS === "web") {
      setWebHour(time.getHours());
      setWebMinute(time.getMinutes());
      setShowWebTimePicker(true);
    } else {
      setShowNativeTimePicker(true);
    }
  };

  const onPickNativeTime = (_event: any, selected?: Date) => {
    if (Platform.OS !== "ios") setShowNativeTimePicker(false);
    if (selected) setTime(selected);
  };

  const applyWebTime = () => {
    const d = new Date(time);
    d.setHours(webHour);
    d.setMinutes(webMinute);
    d.setSeconds(0, 0);
    setTime(d);
    setShowWebTimePicker(false);
  };

  const pickCoverImage = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      setCoverUri(result.assets[0].uri);
      setCoverAsset(result.assets[0]);
    }
  };

  useEffect(() => {
    if (keepCoordinatesOnNextPlaceChangeRef.current) {
      keepCoordinatesOnNextPlaceChangeRef.current = false;
      return;
    }

    setLat(null);
    setLon(null);
  }, [place]);

  const selectSuggestion = (s: PlaceSuggestion) => {
    keepCoordinatesOnNextPlaceChangeRef.current = true;
    setPlace(s.display_name);

    const latNum = Number(s.lat);
    const lonNum = Number(s.lon);
    setLat(Number.isFinite(latNum) ? latNum : null);
    setLon(Number.isFinite(lonNum) ? lonNum : null);
    setPlaceFocused(false);
  };

  const clearPlace = () => {
    keepCoordinatesOnNextPlaceChangeRef.current = false;
    setPlace("");
    setLat(null);
    setLon(null);
    setPlaceFocused(false);
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const assignTagsToEvent = async (eventId: number | string, tagIds: number[]) => {
    const failures: string[] = [];

    await Promise.all(
      tagIds.map(async (tagId) => {
        try {
          await apiClient.post(`/event-tags/${tagId}/add_to_event/`, {
            event_id: Number(eventId),
          });
        } catch (error) {
          console.error(`Error assigning tag ${tagId}:`, error);
          const tag = availableTags.find((t) => t.id === tagId);
          failures.push(tag?.name || `Tag ${tagId}`);
        }
      })
    );

    return failures;
  };

  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const closeSuccessAndGoRoot = () => {
    setSuccessModalOpen(false);
    goToRoot();
  };

  const publish = async () => {
    setFormError(null);

    const titleTrimmed = title.trim();
    if (!titleTrimmed) {
      setFormError("El título es obligatorio.");
      return;
    }
    if (!selectedCalendar?.id) {
      setFormError("Selecciona un calendar.");
      return;
    }

    if (!user) {
      setFormError("User not authenticated.");
      return;
    }

    const calendarsIds = [Number(selectedCalendar.id)];

    try {
      setPublishing(true);

      let createdEvent: any;

      if (coverAsset) {
        const formData = new FormData();
        formData.append("title", titleTrimmed);
        formData.append("description", description?.trim() ?? "");
        formData.append("place_name", place?.trim() ?? "");
        formData.append("date", toISODate(date));
        formData.append("time", toHMS(time));
        formData.append("calendars", JSON.stringify(calendarsIds));
        formData.append("creator_id", String(user.id));

        if (lat != null && lon != null) {
          formData.append("latitud", String(lat));
          formData.append("longitud", String(lon));
        }

        await appendPhoto(formData, coverAsset, "photo");
        createdEvent = await createEvent(formData);
      } else {
        const payload: any = {
          title: titleTrimmed,
          description: description?.trim() ?? "",
          place_name: place?.trim() ?? "",
          date: toISODate(date),
          time: toHMS(time),
          calendars: calendarsIds,
          creator_id: user.id,
        };

        if (lat != null && lon != null) {
          payload.latitud = lat;
          payload.longitud = lon;
        }

        createdEvent = await createEvent(payload);
      }

      const createdEventId = createdEvent?.id;

      if (createdEventId && selectedTagIds.length > 0) {
        const failedTags = await assignTagsToEvent(createdEventId, selectedTagIds);

        if (failedTags.length > 0) {
          setFormError(
            `El evento se creó, pero no se pudieron asignar estas etiquetas: ${failedTags.join(", ")}`
          );
        }
      }

      setSuccessModalOpen(true);
    } catch (e: any) {
      setFormError(e?.message ?? "No se pudo crear el event");
    } finally {
      setPublishing(false);
    }
  };

  const miniSize = Math.min(280, formWidth);
  const showSuggestions = placeFocused && suggestions.length > 0;

  return (
    <View style={styles.container}>
      <Pressable style={styles.backBtn} hitSlop={12} onPress={goBackOrCalendars}>
        <Ionicons name="chevron-back" size={22} color={WHITE} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>New Event</Text>

        <View style={[styles.body, { width: formWidth }]}>
          <View style={styles.headerRow}>
            <View style={styles.block}>
              <View style={styles.calendarLabelRow}>
                <Text style={styles.smallLabelInline}>Calendar:</Text>
                <Pressable
                  style={styles.dropdownInline}
                  onPress={() => setCalendarModalOpen(true)}
                  disabled={calLoading || calendars.length === 0}
                >
                  <Ionicons name="chevron-down" size={18} color={TEXT} />
                </Pressable>
              </View>

              <View style={styles.calendarPreview}>
                <View style={styles.calendarImgWrap}>
                  <View style={styles.calendarImgPlaceholder} />
                </View>

                {calLoading ? (
                  <View style={{ marginTop: 6 }}>
                    <ActivityIndicator />
                  </View>
                ) : (
                  <Text style={styles.calendarName} testID="create-event-selected-calendar-name">
                    {selectedCalendar?.name ?? (calendars.length ? "Select" : "No calendars")}
                  </Text>
                )}
              </View>

              {!!calError && <Text style={styles.errorText}>{calError}</Text>}
            </View>

            <View style={styles.block}>
              <Text style={styles.smallLabelCentered}>Photos</Text>

              <Pressable style={styles.photoBox} onPress={pickCoverImage}>
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.photoPreview} />
                ) : (
                  <Ionicons name="camera" size={28} color={TEXT} />
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.form}>
            {!!formError && (
              <Text style={styles.errorText} testID="create-event-error-text">
                {formError}
              </Text>
            )}

            <Text style={styles.fieldLabel}>Title:</Text>
            <TextInput
              maxLength={150}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              testID="create-event-title-input"
            />

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Description:</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={styles.textAreaSmall}
              multiline
              textAlignVertical="top"
              scrollEnabled
              testID="create-event-description-input"
            />

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Place:</Text>

            <View style={styles.placeRow}>
              <TextInput
                maxLength={255}
                value={place}
                onChangeText={setPlace}
                style={[styles.input, { flex: 1, paddingRight: 38 }]}
                onFocus={() => setPlaceFocused(true)}
                onBlur={() => {
                  setTimeout(() => setPlaceFocused(false), 120);
                }}
                placeholder="Empieza a escribir una dirección..."
                placeholderTextColor="rgba(16,70,77,0.45)"
                testID="create-event-place-input"
              />

              {!!place && (
                <Pressable style={styles.clearBtn} onPress={clearPlace} hitSlop={10}>
                  <Ionicons name="close" size={18} color={TEXT} />
                </Pressable>
              )}

              {placeLoading && (
                <View style={styles.placeSpinner}>
                  <ActivityIndicator size="small" />
                </View>
              )}
            </View>

            {!!placeError && <Text style={styles.errorText}>{placeError}</Text>}

            {showSuggestions && (
              <View style={styles.suggestBox}>
                {suggestions.map((s) => (
                  <Pressable
                    key={String(s.place_id)}
                    style={styles.suggestItem}
                    onPress={() => selectSuggestion(s)}
                  >
                    <Ionicons name="location-outline" size={16} color={TEXT} />
                    <Text style={styles.suggestText} numberOfLines={2}>
                      {s.display_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {lat != null && lon != null && (
              <Text style={styles.coordsText}>
                Coordenadas: {lat.toFixed(6)}, {lon.toFixed(6)}
              </Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Labels:</Text>

            {tagsLoading ? (
              <View style={styles.tagsLoadingWrap}>
                <ActivityIndicator color={TEXT} />
              </View>
            ) : tagsError ? (
              <Text style={styles.errorText}>{tagsError}</Text>
            ) : availableTags.length > 0 ? (
              <View style={styles.tagsWrap}>
                {availableTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);

                  return (
                    <Pressable
                      key={tag.id}
                      style={[styles.tagChip, selected && styles.tagChipSelected]}
                      onPress={() => toggleTag(tag.id)}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          selected && styles.tagChipTextSelected,
                        ]}
                      >
                        {tag.name}
                      </Text>
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={TEXT}
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : selectedCalendar?.id ? (
              <Text style={styles.helperText}>This calendar has no available labels.</Text>
            ) : null}

            <View style={styles.timeRow}>
              <Text style={styles.fieldLabel}>Date:</Text>
              <View style={styles.timePill}>
                <Text style={styles.timeText}>{dateLabel}</Text>
              </View>
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.fieldLabel}>Time:</Text>
              <Pressable style={styles.timePill} onPress={openTimePicker}>
                <Text style={styles.timeText}>{timeLabel}</Text>
              </Pressable>
            </View>

            <View style={styles.calendarCenterWrap}>
              <MiniMonthCalendar value={date} onChange={setDate} size={miniSize} />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                marginTop: 14,
              }}
            >
              <Pressable style={styles.cancelBtn} onPress={goBackOrCalendars}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
                onPress={publish}
                disabled={publishing}
                testID="create-event-submit-button"
              >
                {publishing ? (
                  <ActivityIndicator color="#EAF7F6" />
                ) : (
                  <Text style={styles.publishText}>Publish</Text>
                )}
              </Pressable>
            </View>
            <View style={{ height: 40 }} />
          </View>
        </View>
      </ScrollView>

      <Modal visible={calendarModalOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setCalendarModalOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select calendar</Text>

            {calLoading ? (
              <View style={{ paddingVertical: 14 }}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={calendars}
                keyExtractor={(i) => i.id}
                ItemSeparatorComponent={() => <View style={styles.modalSep} />}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalItem}
                    onPress={async () => {
                      setSelectedCalendar(item);
                      setCalendarModalOpen(false);
                      await loadTagsForCalendar(item.id);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.helperText}>No hay calendars. Crea uno primero.</Text>
                }
              />
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={successModalOpen} transparent animationType="fade">
        <Pressable style={styles.successOverlay} onPress={closeSuccessAndGoRoot}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={28} color={WHITE} />
            </View>

            <Text style={styles.successTitle}>Ready!</Text>
            <Text style={styles.successBody} testID="create-event-success-text">
              Event created successfully
            </Text>

            <Pressable
              style={styles.successBtn}
              onPress={closeSuccessAndGoRoot}
              testID="create-event-success-ok-button"
            >
              <Text style={styles.successBtnText}>OK</Text>
            </Pressable>

            <Pressable style={styles.successClose} onPress={closeSuccessAndGoRoot}>
              <Ionicons name="close" size={18} color={TEXT} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {showNativeTimePicker && (
        <>
          {Platform.OS === "ios" ? (
            <Modal transparent animationType="fade">
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerCard}>
                  <Text style={styles.pickerTitle}>Select time</Text>

                  <DateTimePicker
                    value={time}
                    mode="time"
                    display="spinner"
                    onChange={onPickNativeTime}
                  />

                  <Pressable
                    style={styles.pickerDone}
                    onPress={() => setShowNativeTimePicker(false)}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={time}
              mode="time"
              display="spinner"
              onChange={onPickNativeTime}
            />
          )}
        </>
      )}

      {showWebTimePicker && (
        <Modal transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Select time</Text>

              <View style={styles.webTimeRow}>
                <View style={styles.webListBox}>
                  <FlatList
                    data={Array.from({ length: 24 }, (_, i) => i)}
                    keyExtractor={(i) => `h-${i}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item }) => {
                      const selectedH = item === webHour;
                      return (
                        <Pressable
                          onPress={() => setWebHour(item)}
                          style={[
                            styles.webListItem,
                            selectedH && styles.webListItemSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.webListItemText,
                              selectedH && styles.webListItemTextSelected,
                            ]}
                          >
                            {pad2(item)}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>

                <View style={styles.webListBox}>
                  <FlatList
                    data={Array.from({ length: 60 }, (_, i) => i)}
                    keyExtractor={(i) => `m-${i}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item }) => {
                      const selectedM = item === webMinute;
                      return (
                        <Pressable
                          onPress={() => setWebMinute(item)}
                          style={[
                            styles.webListItem,
                            selectedM && styles.webListItemSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.webListItemText,
                              selectedM && styles.webListItemTextSelected,
                            ]}
                          >
                            {pad2(item)}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              </View>

              <View style={styles.webTimeActions}>
                <Pressable
                  style={styles.webCancelBtn}
                  onPress={() => setShowWebTimePicker(false)}
                >
                  <Text style={styles.webCancelText}>Cancel</Text>
                </Pressable>

                <Pressable style={styles.pickerDone} onPress={applyWebTime}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const ITEM_H = 20;
const VISIBLE_ITEMS = 3;

const styles = StyleSheet.create({
  container: { flex: 1 },

  iconBtn: { padding: 6 },

  scrollContent: { paddingTop: 64, paddingBottom: 120 },

  header: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    color: TEXT,
    marginTop: 6,
    marginBottom: 6,
  },

  body: { alignSelf: "center" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  block: { flex: 1, alignItems: "center" },

  calendarLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  smallLabelInline: { color: TEXT, fontSize: 13, fontWeight: "800" },
  dropdownInline: {
    width: 42,
    height: 30,
    borderWidth: 1.5,
    borderColor: TEXT,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  smallLabelCentered: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },

  calendarPreview: { alignItems: "center" },
  calendarImgWrap: {
    width: 74,
    height: 74,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#EDE7D5",
  },
  calendarImgPlaceholder: { width: "100%", height: "100%" },
  calendarName: { marginTop: 6, color: TEXT, fontSize: 12, fontWeight: "800" },

  photoBox: {
    width: 90,
    height: 82,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: TEXT,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  photoPreview: { width: "100%", height: "100%", borderRadius: 12 },

  helperText: {
    marginTop: 6,
    fontSize: 11,
    color: TEXT,
    opacity: 0.6,
    textAlign: "center",
  },

  form: { paddingHorizontal: 6, paddingTop: 4 },

  fieldLabel: { color: TEXT, fontSize: 14, fontWeight: "800", marginBottom: 6 },

  input: {
    height: 34,
    borderWidth: 2,
    borderColor: PINK,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  textAreaSmall: {
    height: 64,
    borderWidth: 2,
    borderColor: PINK,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PINK,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  timeText: { color: TEXT, fontWeight: "900" },

  calendarCenterWrap: { marginTop: 12, alignItems: "center", justifyContent: "center" },

  publishBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: TEAL,
    borderWidth: 2,
    borderColor: "#0B3D3D",
    alignItems: "center",
  },
  publishBtnDisabled: { opacity: 0.65 },
  publishText: { textAlign: "center", color: "#EAF7F6", fontWeight: "900", fontSize: 16 },

  errorText: { color: RED, fontWeight: "800", marginBottom: 8 },

  placeRow: { flexDirection: "row", alignItems: "center" },
  clearBtn: {
    position: "absolute",
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1.5,
    borderColor: "rgba(16,70,77,0.18)",
  },
  placeSpinner: { position: "absolute", right: 40 },

  suggestBox: {
    marginTop: 6,
    borderWidth: 2,
    borderColor: "rgba(242,163,166,0.85)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
    overflow: "hidden",
  },
  suggestItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16,70,77,0.10)",
  },
  suggestText: { flex: 1, color: TEXT, fontWeight: "800", fontSize: 12 },

  coordsText: {
    marginTop: 6,
    fontSize: 11,
    color: TEXT,
    opacity: 0.75,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: { width: "92%", maxWidth: 420, backgroundColor: WHITE, borderRadius: 16, padding: 14 },
  modalTitle: { color: TEXT, fontWeight: "900", fontSize: 16, marginBottom: 10 },
  modalSep: { height: 1, backgroundColor: "rgba(16,70,77,0.12)" },
  modalItem: { paddingVertical: 12, paddingHorizontal: 10 },
  modalItemText: { color: TEXT, fontWeight: "800" },

  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  pickerCard: { width: "92%", maxWidth: 440, backgroundColor: WHITE, borderRadius: 16, padding: 14 },
  pickerTitle: { color: TEXT, fontWeight: "900", fontSize: 16, marginBottom: 10 },
  pickerDone: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(31,106,106,0.12)",
  },
  pickerDoneText: { color: TEXT, fontWeight: "900" },

  webTimeRow: { flexDirection: "row", gap: 12 },
  webListBox: {
    flex: 1,
    height: ITEM_H * VISIBLE_ITEMS + 10,
    borderWidth: 2,
    borderColor: PINK,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.45)",
    overflow: "hidden",
  },
  webList: { flex: 1 },
  webListContent: { paddingVertical: 5 },
  webListItem: {
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  webListItemSelected: { backgroundColor: "rgba(242,163,166,0.18)", borderWidth: 1.5, borderColor: PINK },
  webListItemText: { color: TEXT, fontWeight: "800" },
  webListItemTextSelected: { color: TEXT, fontWeight: "900" },

  webTimeActions: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  webCancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "rgba(16,70,77,0.08)" },
  webCancelText: { color: TEXT, fontWeight: "900" },

  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.30)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  successCard: {
    width: "92%",
    maxWidth: 420,
    backgroundColor: BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(16,70,77,0.20)",
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    alignItems: "center",
  },
  successIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0B3D3D",
    marginBottom: 10,
  },
  successTitle: { color: TEXT, fontWeight: "900", fontSize: 18, marginBottom: 4 },
  successBody: { color: TEXT, fontWeight: "800", opacity: 0.75, textAlign: "center", marginBottom: 14 },
  successBtn: { width: 150, paddingVertical: 10, borderRadius: 16, backgroundColor: TEAL, borderWidth: 2, borderColor: "#0B3D3D" },
  successBtnText: { textAlign: "center", color: "#EAF7F6", fontWeight: "900" },
  successClose: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1.5,
    borderColor: "rgba(16,70,77,0.25)",
  },

  backBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 50,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0B3D3D",
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#10464D",
    alignItems: "center",
  },
  cancelText: {
    color: "#10464D",
    fontWeight: "900",
    fontSize: 16,
  },

  // añade también aquí los nuevos estilos
  tagsLoadingWrap: {
    paddingVertical: 8,
    alignItems: "flex-start",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#d8e6e7",
    backgroundColor: "#f7fbfb",
  },
  tagChipSelected: {
    borderColor: "#10464d",
    backgroundColor: "#e8f2f2",
  },
  tagChipText: {
    color: "#10464d",
    fontSize: 13,
    fontWeight: "600",
  },
  tagChipTextSelected: {
    fontWeight: "700",
  },
});