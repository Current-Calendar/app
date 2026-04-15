import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import apiClient, { appendPhoto } from "@/services/api-client";
import { useCreateEventApi } from "@/hooks/use-create-event-api";
import { usePlaceSearch, PlaceSuggestion } from "@/hooks/use-place-search";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";

import MiniMonthCalendar from "@/components/events/MiniMonthCalendar";
import CalendarSelectorModal from "@/components/events/CalendarSelectorModal";
import EventSuccessModal from "@/components/events/EventSuccessModal";
import EventTimePickerModal from "@/components/events/EventTimePickerModal";
import CustomToast from "@/components/ui/custom-toast";

const TEXT = "#10464d";
const RED = "#d9534f";
const PLACE_DEBOUNCE_MS = 350;

type CalendarItem = {
  id: string;
  name: string;
  image?: any;
};

type EventTagItem = {
  id: number;
  name: string;
  category: number;
  category_name?: string;
  events_count?: number;
};

type ApiListResponse<T> = T[] | { results?: T[]; data?: T[] };

const extractArray = <T,>(
  response: ApiListResponse<T> | null | undefined,
): T[] => {
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

export default function EditEventsScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { loadMyCalendars } = useCreateEventApi();
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = params.id;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);

  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarItem | null>(
    null,
  );

  const [availableTags, setAvailableTags] = useState<EventTagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [initialTagIds, setInitialTagIds] = useState<number[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverAsset, setCoverAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);

  const [placeFocused, setPlaceFocused] = useState(false);
  const keepCoordinatesOnNextPlaceChangeRef = useRef(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [time, setTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return d;
  });
  const [endTime, setEndTime] = useState<Date | null>(null);

  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);
  const [webHour, setWebHour] = useState(time.getHours());
  const [webMinute, setWebMinute] = useState(time.getMinutes());

  const {
    suggestions,
    loading: placeLoading,
    error: placeError,
  } = usePlaceSearch(place, {
    enabled: placeFocused,
    delayMs: PLACE_DEBOUNCE_MS,
    limit: 6,
  });

  const selectedTags = useMemo(
    () => availableTags.filter((tag) => selectedTagIds.includes(tag.id)),
    [availableTags, selectedTagIds],
  );

  const timeLabel = useMemo(() => `${toHM(time)} h`, [time]);
  const dateLabel = useMemo(() => toISODate(date), [date]);
  const endTimeLabel = useMemo(() => endTime instanceof Date && !isNaN(endTime.getTime()) ? `${toHM(endTime)} h` : 'End time', [endTime]);
  const endDateLabel = useMemo(() => endDate instanceof Date && !isNaN(endDate.getTime()) ? toISODate(endDate) : 'End date', [endDate]);

  const goBackOrCalendars = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace("/(tabs)/calendars");
    }
  };

  const closeSuccessAndGoRoot = () => {
    setSuccessModalOpen(false);
    router.replace(
      `/(tabs)/calendars?selectedDate=${toISODate(date)}&selectedCalendarId=${selectedCalendar?.id ?? ""}` as any,
    );
  };

  const loadTagsForCalendar = async (calendarId: string | number) => {
    try {
      setTagsLoading(true);
      setTagsError(null);

      const response = (await apiClient.get(
        `/event-tags/for-calendar/${calendarId}/`,
      )) as ApiListResponse<EventTagItem>;

      const list = extractArray(response);
      setAvailableTags(list);

      setSelectedTagIds((prev) =>
        prev.filter((tagId) => list.some((tag) => tag.id === tagId)),
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

  const loadEventAssignedTags = async (currentEventId: string | number) => {
    try {
      const response = (await apiClient.get(
        `/event-tags/for-event/${currentEventId}/`,
      )) as ApiListResponse<EventTagItem>;

      const assignedTags = extractArray(response);
      const assignedIds = assignedTags
        .map((tag) => Number(tag.id))
        .filter((id) => Number.isFinite(id));

      setSelectedTagIds(assignedIds);
      setInitialTagIds(assignedIds);
    } catch (error: any) {
      console.error("Error loading event assigned tags:", error);
      setSelectedTagIds([]);
      setInitialTagIds([]);
    }
  };

  const loadCalendars = async (): Promise<CalendarItem[]> => {
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

      const mapped = list
        .map(mapCalendarFromApi)
        .filter((c: CalendarItem) => c.id);

      setCalendars(mapped);
      return mapped;
    } catch (e: any) {
      setCalError(e?.message ?? "Error loading calendars");
      setCalendars([]);
      return [];
    } finally {
      setCalLoading(false);
    }
  };

  const loadEventData = async (availableCalendars: CalendarItem[]) => {
    if (!eventId) {
      setFormError("Event ID not found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const event: any = await apiClient.get<any>(`/events/${eventId}/edit/`);

      setTitle(event.title ?? "");
      setDescription(event.description ?? "");
      setPlace(event.place_name ?? "");
      setCoverUri(event.photo ?? null);

      if (event.date) {
        const [y, m, d] = String(event.date).split("-").map(Number);
        const eventDate = new Date(y, m - 1, d);
        eventDate.setHours(0, 0, 0, 0);
        setDate(eventDate);
      }
      if (event.end_date) {
        const [y, m, d] = String(event.end_date).split("-").map(Number);
        const eventEndDate = new Date(y, m - 1, d);
        eventEndDate.setHours(0, 0, 0, 0);
        setEndDate(eventEndDate);
      }

      if (event.time) {
        const [h = "14", m = "00"] = String(event.time).split(":");
        const parsedTime = new Date();
        parsedTime.setHours(Number(h), Number(m), 0, 0);
        setTime(parsedTime);
        setWebHour(Number(h));
        setWebMinute(Number(m));
      }
      if (event.end_time) {
        const [h = "14", m = "00"] = String(event.end_time).split(":");
        const parsedEndTime = new Date();
        parsedEndTime.setHours(Number(h), Number(m), 0, 0);
        setEndTime(parsedEndTime);
      }

      if (event.latitude && event.longitude) {
        setLat(event.latitude);
        setLon(event.longitude);
      }

      if (event?.calendars?.length > 0) {
        const selectedId = String(event.calendars[0]);
        const foundCalendar = availableCalendars.find(
          (c) => c.id === selectedId,
        );

        if (foundCalendar) {
          setSelectedCalendar(foundCalendar);
          await loadTagsForCalendar(foundCalendar.id);
        }
      }

      await loadEventAssignedTags(eventId);
    } catch (e: any) {
      setFormError(e?.message ?? "Could not load the event");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      if (!eventId) {
        setFormError("Event ID not found.");
        setLoading(false);
        return;
      }

      const loadedCalendars = await loadCalendars();
      await loadEventData(loadedCalendars);
    };

    void init();
  }, [eventId]);

  useEffect(() => {
    if (keepCoordinatesOnNextPlaceChangeRef.current) {
      keepCoordinatesOnNextPlaceChangeRef.current = false;
      return;
    }

    setLat(null);
    setLon(null);
  }, [place]);

  const [activeTimePicker, setActiveTimePicker] = useState<"start" | "end">("start");

  const openTimePicker = (which: "start" | "end", currentTime: Date) => {
    setActiveTimePicker(which);
    if (Platform.OS === "web") {
      setWebHour(currentTime.getHours());
      setWebMinute(currentTime.getMinutes());
      setShowWebTimePicker(true);
    } else {
      setShowNativeTimePicker(true);
    }
  };

  const onPickNativeTime = (_event: any, selected?: Date) => {
    if (Platform.OS !== "ios") setShowNativeTimePicker(false);
    if (selected) {
      if (activeTimePicker === "start") setTime(selected);
      if (activeTimePicker === "end") setEndTime(selected);
    }
  };

  const applyWebTime = () => {
    const base = activeTimePicker === "start" ? time : (endTime ?? new Date());
    const d = new Date(base);
    d.setHours(webHour);
    d.setMinutes(webMinute);
    d.setSeconds(0, 0);
    if (activeTimePicker === "start") setTime(d);
    if (activeTimePicker === "end") setEndTime(d);
    setShowWebTimePicker(false);
  };

  const pickCoverImage = async () => {
    setImageError(null);
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const MAX_FILE_SIZE = 3 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        setImageError(
          "The selected image is too large. Please choose one under 3MB.",
        );
        return;
      }
      setImageError(null);
      setCoverUri(asset.uri);
      setCoverAsset(asset);
    }
  };

  const removeCoverImage = () => {
    setCoverUri(null);
    setCoverAsset(null);
  };

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
        : [...prev, tagId],
    );
  };

  const syncEventTags = async () => {
    const currentSet = new Set(selectedTagIds);
    const initialSet = new Set(initialTagIds);

    const toAdd = selectedTagIds.filter((id) => !initialSet.has(id));
    const toRemove = initialTagIds.filter((id) => !currentSet.has(id));

    const failedAdds: string[] = [];
    const failedRemoves: string[] = [];

    await Promise.all(
      toAdd.map(async (tagId) => {
        try {
          await apiClient.post(`/event-tags/${tagId}/add_to_event/`, {
            event_id: Number(eventId),
          });
        } catch {
          const tag = availableTags.find((t) => t.id === tagId);
          failedAdds.push(tag?.name || `Tag ${tagId}`);
        }
      }),
    );

    await Promise.all(
      toRemove.map(async (tagId) => {
        try {
          await apiClient.post(`/event-tags/${tagId}/remove_from_event/`, {
            event_id: Number(eventId),
          });
        } catch {
          const tag = availableTags.find((t) => t.id === tagId);
          failedRemoves.push(tag?.name || `Tag ${tagId}`);
        }
      }),
    );

    return { failedAdds, failedRemoves };
  };

  const handleUpdate = async () => {
    setFormError(null);

    const todayKey = toISODate(new Date());
    const selectedDateKey = toISODate(date);

    if (selectedDateKey < todayKey) {
      setFormError("You cannot edit an event to occur in the past.");
      return;
    }

    if (selectedDateKey === todayKey) {
      const now = new Date();
      const currentTimeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      if (toHM(time) < currentTimeStr) {
        setFormError("You cannot edit an event to occur in the past.");
        return;
      }
    }

    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }

    if (!selectedCalendar?.id) {
      setFormError("Please select a calendar.");
      return;
    }

    if (!eventId) {
      setFormError("Event not found.");
      return;
    }

    setSaving(true);
    const calendarsIds = [Number(selectedCalendar.id)];

    try {
      if (coverAsset) {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("place_name", place.trim());
        formData.append("date", toISODate(date));
        formData.append("time", toHMS(time));
        if (endDate) formData.append("end_date", toISODate(endDate));
        if (endTime) formData.append("end_time", toHMS(endTime));
        formData.append("calendars", JSON.stringify(calendarsIds));

        if (lat != null && lon != null) {
          formData.append("latitud", String(lat));
          formData.append("longitud", String(lon));
        }

        await appendPhoto(formData, coverAsset, "photo");
        await apiClient.put<any>(`/events/${eventId}/edit/`, formData);
      } else {
        const updateData: any = {
          title: title.trim(),
          description: description.trim(),
          place_name: place.trim(),
          date: toISODate(date),
          time: toHMS(time),
          calendars: calendarsIds,
        };
        if (endDate) updateData.end_date = toISODate(endDate);
        if (endTime) updateData.end_time = toHMS(endTime);

        if (lat != null && lon != null) {
          updateData.latitud = lat;
          updateData.longitud = lon;
        }

        if (!coverUri) {
          updateData.remove_photo = "true";
        }

        await apiClient.put<any>(`/events/${eventId}/edit/`, updateData);
      }

      const { failedAdds, failedRemoves } = await syncEventTags();

      if (failedAdds.length || failedRemoves.length) {
        const parts: string[] = [];
        if (failedAdds.length)
          parts.push(`Could not add: ${failedAdds.join(", ")}`);
        if (failedRemoves.length)
          parts.push(`Could not remove: ${failedRemoves.join(", ")}`);
        setFormError(parts.join("\n"));
      }

      setSuccessModalOpen(true);
    } catch (error: any) {
      setFormError(error?.message ?? "Failed to update the event.");
    } finally {
      setSaving(false);
    }
  };

  const showSuggestions = placeFocused && suggestions.length > 0;
  const miniSize = isDesktop ? 360 : Math.min(width - 48, 320);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={TEXT} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          isDesktop && styles.containerDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <ThemedText
            type="title"
            lightColor={TEXT}
            darkColor={TEXT}
            style={styles.title}
          >
            Edit Event
          </ThemedText>

          {/* Cover Image */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Cover Image</Text>

            {coverUri ? (
              <View style={styles.coverPreviewContainer}>
                <Image source={{ uri: coverUri }} style={styles.coverPreview} />
                <Pressable
                  style={styles.coverRemoveButton}
                  onPress={removeCoverImage}
                >
                  <Ionicons name="close-circle" size={26} color="#fff" />
                </Pressable>
                <Pressable
                  style={styles.coverChangeButton}
                  onPress={pickCoverImage}
                >
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                  <Text style={styles.coverChangeText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.coverPickerEmpty}
                onPress={pickCoverImage}
              >
                <View style={styles.coverPickerIconWrap}>
                  <Ionicons name="image-outline" size={28} color={TEXT} />
                </View>
                <Text style={styles.coverPickerLabel}>Add an event cover</Text>
                <Text style={styles.coverPickerSub}>
                  Recommended: 16:9 ratio
                </Text>
              </Pressable>
            )}
            {!!imageError && (
              <Text style={{ color: RED, fontSize: 13, marginTop: 8 }}>
                {imageError}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Event Details */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Event Details</Text>

            <TextInput
              style={styles.input}
              placeholder="Event title"
              placeholderTextColor="#aaa"
              maxLength={150}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.divider} />

          {/* Calendar */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Calendar</Text>

            <Pressable
              style={styles.selectorCard}
              onPress={() => setCalendarModalOpen(true)}
              disabled={calLoading || calendars.length === 0}
            >
              <View style={styles.selectorIconWrap}>
                <Ionicons name="calendar-outline" size={22} color={TEXT} />
              </View>

              <View style={styles.selectorContent}>
                <Text style={styles.selectorLabel}>Selected calendar</Text>
                {calLoading ? (
                  <ActivityIndicator color={TEXT} />
                ) : (
                  <Text style={styles.selectorValue}>
                    {selectedCalendar?.name ??
                      (calendars.length ? "Select a calendar" : "No calendars")}
                  </Text>
                )}
              </View>

              <Ionicons name="chevron-down" size={20} color={TEXT} />
            </Pressable>

            {!!calError && <Text style={styles.errorText}>{calError}</Text>}
          </View>

          <View style={styles.divider} />

          {/* Location */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Location</Text>

            <View style={styles.placeInputWrap}>
              <TextInput
                maxLength={255}
                value={place}
                onChangeText={setPlace}
                style={[styles.input, styles.placeInput]}
                onFocus={() => setPlaceFocused(true)}
                onBlur={() => {
                  setTimeout(() => setPlaceFocused(false), 120);
                }}
                placeholder="Start typing an address..."
                placeholderTextColor="#aaa"
              />

              {!!place && (
                <Pressable
                  style={styles.clearBtn}
                  onPress={clearPlace}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={18} color={TEXT} />
                </Pressable>
              )}

              {placeLoading && (
                <View style={styles.placeSpinner}>
                  <ActivityIndicator size="small" color={TEXT} />
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
              <Text style={styles.helperText}>
                Coordinates: {lat.toFixed(6)}, {lon.toFixed(6)}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Labels */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Labels</Text>
            <Text style={styles.sectionSubtitle}>
              Select one or more labels for this event
            </Text>

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
                      style={[
                        styles.tagChip,
                        selected && styles.tagChipSelected,
                      ]}
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
              <Text style={styles.helperText}>
                This calendar has no available labels.
              </Text>
            ) : null}

            {!!selectedTags.length && (
              <Text style={styles.helperText}>
                Selected: {selectedTags.map((tag) => tag.name).join(", ")}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Start Date & Time */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Start Date</Text>
            <View>
              <View style={styles.timeDateDiv}>
                <View style={styles.infoPill}>
                  <Text style={styles.infoPillText}>{dateLabel}</Text>
                </View>
                <View style={styles.dateTimeBox}>
                  <Pressable style={styles.infoPill} onPress={() => openTimePicker("start", time)}>
                    <Text style={styles.infoPillText}>{timeLabel}</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.calendarCenterWrap}>
                <MiniMonthCalendar
                  value={date}
                  onChange={setDate}
                  size={miniSize}
                />
              </View>
            </View>
          </View>

          {/* End Date & Time */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>End Date</Text>
            <View>
              <View style={styles.timeDateDiv}>
                <View style={styles.infoPill}>
                  <Text style={styles.infoPillText}>{endDateLabel}</Text>
                </View>
                <View style={styles.dateTimeBox}>
                  <Pressable style={styles.infoPill} onPress={() => {
                    if (!endTime) setEndTime(new Date());
                    openTimePicker("end", endTime ?? new Date());
                  }}>
                    <Text style={styles.infoPillText}>{endTimeLabel}</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.calendarCenterWrap}>
                <MiniMonthCalendar
                  value={endDate ?? date}
                  onChange={setEndDate}
                  size={miniSize}
                />
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View
            style={[
              styles.buttonGroup,
              { flexDirection: width < 380 ? "column" : "row" },
            ]}
          >
            <Pressable
              style={styles.cancelButton}
              onPress={goBackOrCalendars}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[
                styles.publishButton,
                saving && styles.publishButtonDisabled,
              ]}
              onPress={handleUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.publishText}>Update Event</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CalendarSelectorModal
        visible={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        calendars={calendars}
        loading={calLoading}
        onSelect={async (calendar: CalendarItem) => {
          setSelectedCalendar(calendar);
          setCalendarModalOpen(false);
          await loadTagsForCalendar(calendar.id);
        }}
      />

      <EventSuccessModal
        visible={successModalOpen}
        onClose={closeSuccessAndGoRoot}
      />

      <EventTimePickerModal
        visibleNative={showNativeTimePicker}
        visibleWeb={showWebTimePicker}
        time={activeTimePicker === "end" ? (endTime ?? time) : time}
        webHour={webHour}
        webMinute={webMinute}
        setWebHour={setWebHour}
        setWebMinute={setWebMinute}
        onChangeNative={onPickNativeTime}
        onCloseNative={() => setShowNativeTimePicker(false)}
        onCloseWeb={() => setShowWebTimePicker(false)}
        onApplyWeb={applyWebTime}
      />

      <CustomToast
        message={formError}
        onHide={() => setFormError(null)}
        type="error"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  containerDesktop: {
    alignItems: "center",
    paddingVertical: 40,
    paddingBottom: 40,
  },
  card: {
    width: "100%",
  },
  cardDesktop: {
    width: "100%",
    maxWidth: 680,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    textAlign: "center",
    marginVertical: 16,
    color: TEXT,
  },
  inputSection: {
    marginBottom: 24,
  },
  timeDateDiv: {
    flexDirection: "row",
    width: "60%",
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 15,
    color: TEXT,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6f7d7f",
    marginBottom: 12,
  },
  coverPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginVertical: 24,
  },
  selectorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
  },
  selectorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectorContent: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    color: "#6f7d7f",
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  placeInputWrap: {
    position: "relative",
  },
  placeInput: {
    paddingRight: 80,
    marginBottom: 0,
  },
  clearBtn: {
    position: "absolute",
    right: 12,
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f5f5",
  },
  placeSpinner: {
    position: "absolute",
    right: 48,
    top: 16,
  },
  suggestBox: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#d8e6e7",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  suggestItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef3f3",
  },
  suggestText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
  },
  tagsLoadingWrap: {
    paddingVertical: 8,
    alignItems: "flex-start",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
    borderColor: TEXT,
    backgroundColor: "#e8f2f2",
  },
  tagChipText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
  },
  tagChipTextSelected: {
    fontWeight: "700",
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: "#6b6b6b",
  },
  dateTimeBox: {
    flex: 1,
  },
  infoPill: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    flex: 1,
  },
  infoPillText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  calendarCenterWrap: {
    marginTop: 4,
    alignItems: "center",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: TEXT,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cancelText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "bold",
  },
  publishButton: {
    flex: 1,
    backgroundColor: TEXT,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  coverPickerEmpty: {
    borderWidth: 1.5,
    borderColor: "#c8dfe1",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5fafa",
    gap: 6,
  },
  coverPickerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e0eff0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  coverPickerLabel: {
    fontSize: 14,
    color: TEXT,
    fontWeight: "600",
  },
  coverPickerSub: {
    fontSize: 12,
    color: "#999",
  },
  coverPreviewContainer: {
    borderRadius: 12,
    overflow: "hidden",
    height: 180,
    position: "relative",
    backgroundColor: "#f5fafa",
    borderWidth: 1.5,
    borderColor: "#d8e6e7",
  },
  coverRemoveButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 13,
  },
  coverChangeButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  coverChangeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    color: RED,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
