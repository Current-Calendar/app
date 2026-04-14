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
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import apiClient, { appendPhoto } from "@/services/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useCreateEventApi } from "@/hooks/use-create-event-api";
import { usePlaceSearch, PlaceSuggestion } from "@/hooks/use-place-search";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";

import MiniMonthCalendar from "@/components/events/MiniMonthCalendar";
import CalendarSelectorModal from "@/components/events/CalendarSelectorModal";
import EventSuccessModal from "@/components/events/EventSuccessModal";
import EventTimePickerModal from "@/components/events/EventTimePickerModal";

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
  response: ApiListResponse<T> | null | undefined
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

const toHMS = (d: Date) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;

const mapCalendarFromApi = (raw: any): CalendarItem => ({
  id: String(raw?.id ?? raw?.pk ?? ""),
  name: String(raw?.name ?? raw?.title ?? "Calendar"),
});

export default function CreateEventsScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { user } = useAuth();
  const { loadMyCalendars, createEvent } = useCreateEventApi();

  const {
    date: dateParam,
    calendarId: calendarIdParam,
  } = useLocalSearchParams<{
    date: string;
    calendarId: string;
  }>();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);

  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarItem | null>(
    null
  );

  const [availableTags, setAvailableTags] = useState<EventTagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
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

  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);

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
    [availableTags, selectedTagIds]
  );

  const timeLabel = useMemo(() => `${toHM(time)} h`, [time]);
  const dateLabel = useMemo(() => toISODate(date), [date]);

  const goBackOrCalendars = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace("/(tabs)/calendars");
    }
  };

  const goToRoot = () => {
    router.replace(
      `/(tabs)/calendars?selectedCalendarId=${selectedCalendar?.id || ""}`
    );
  };

  const closeSuccessAndGoRoot = () => {
    setSuccessModalOpen(false);
    goToRoot();
  };

  const loadTagsForCalendar = async (calendarId: string | number) => {
    try {
      setTagsLoading(true);
      setTagsError(null);

      const response = (await apiClient.get(
        `/event-tags/for-calendar/${calendarId}/`
      )) as ApiListResponse<EventTagItem>;

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

      const mapped = list
        .map(mapCalendarFromApi)
        .filter((c: CalendarItem) => c.id);

      setCalendars(mapped);

      if (mapped.length > 0) {
        const preSelected =
          selectedCalendar ??
          (calendarIdParam
            ? mapped.find(
                (c: CalendarItem) => c.id === String(calendarIdParam)
              ) ?? mapped[0]
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

  useEffect(() => {
    if (keepCoordinatesOnNextPlaceChangeRef.current) {
      keepCoordinatesOnNextPlaceChangeRef.current = false;
      return;
    }

    setLat(null);
    setLon(null);
  }, [place]);

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
      setCoverUri(result.assets[0].uri);
      setCoverAsset(result.assets[0]);
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
        : [...prev, tagId]
    );
  };

  const assignTagsToEvent = async (
    eventId: number | string,
    tagIds: number[]
  ) => {
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

  const publish = async () => {
    setFormError(null);

    const titleTrimmed = title.trim();

    if (!titleTrimmed) {
      setFormError("Event title is required.");
      return;
    }

    if (!selectedCalendar?.id) {
      setFormError("Please select a calendar.");
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
        const failedTags = await assignTagsToEvent(
          createdEventId,
          selectedTagIds
        );

        if (failedTags.length > 0) {
          setFormError(
            `The event was created, but these labels could not be assigned: ${failedTags.join(
              ", "
            )}`
          );
        }
      }

      setSuccessModalOpen(true);
    } catch (e: any) {
      setFormError(e?.message ?? "Failed to create the event.");
    } finally {
      setPublishing(false);
    }
  };

  const showSuggestions = placeFocused && suggestions.length > 0;
  const miniSize = isDesktop ? 360 : Math.min(width - 48, 320);

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
            Create Event
          </ThemedText>

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Cover Image</Text>

            {coverUri ? (
              <View style={styles.coverPreviewContainer}>
                <Pressable onPress={pickCoverImage}>
                  <View style={styles.coverPreviewInner}>
                    <Text style={styles.coverPreviewText}>Image selected</Text>
                  </View>
                </Pressable>

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
          </View>

          <View style={styles.divider} />

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Event Details</Text>

            {!!formError && (
              <Text style={styles.errorText} testID="create-event-error-text">
                {formError}
              </Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Event title"
              placeholderTextColor="#aaa"
              maxLength={150}
              value={title}
              onChangeText={setTitle}
              testID="create-event-title-input"
            />

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              testID="create-event-description-input"
            />
          </View>

          <View style={styles.divider} />

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
                  <Text
                    style={styles.selectorValue}
                    testID="create-event-selected-calendar-name"
                  >
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
                testID="create-event-place-input"
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
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={TEXT}
                    />
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

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Date & Time</Text>

            <View
              style={[
                styles.dateTimeRow,
                !isDesktop && { flexDirection: "column" },
              ]}
            >
              <View style={styles.dateTimeBox}>
                <Text style={styles.dateTimeLabel}>Date</Text>
                <View style={styles.infoPill}>
                  <Text style={styles.infoPillText}>{dateLabel}</Text>
                </View>
              </View>

              <View style={styles.dateTimeBox}>
                <Text style={styles.dateTimeLabel}>Time</Text>
                <Pressable style={styles.infoPill} onPress={openTimePicker}>
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

          <View
            style={[
              styles.buttonGroup,
              { flexDirection: width < 380 ? "column" : "row" },
            ]}
          >
            <Pressable
              style={styles.cancelButton}
              onPress={goBackOrCalendars}
              disabled={publishing}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[
                styles.publishButton,
                publishing && styles.publishButtonDisabled,
              ]}
              onPress={publish}
              disabled={publishing}
              testID="create-event-submit-button"
            >
              {publishing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.publishText}>Create Event</Text>
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
        time={time}
        webHour={webHour}
        webMinute={webMinute}
        setWebHour={setWebHour}
        setWebMinute={setWebMinute}
        onChangeNative={onPickNativeTime}
        onCloseNative={() => setShowNativeTimePicker(false)}
        onCloseWeb={() => setShowWebTimePicker(false)}
        onApplyWeb={applyWebTime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
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
    fontFamily: Fonts.rounded,
    textAlign: "center",
    marginVertical: 16,
    color: TEXT,
  },
  inputSection: {
    marginBottom: 24,
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
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dateTimeBox: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 13,
    color: TEXT,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoPill: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
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
    fontFamily: Fonts?.rounded,
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
    fontFamily: Fonts?.rounded,
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
  coverPreviewInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coverPreviewText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
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
