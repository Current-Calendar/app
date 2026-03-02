import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
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
  Alert,
  Switch,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { MOCK_CALENDARS } from "@/constants/mock-data";

const BG = "#FBF7EA";
const TEXT = "#10464D";
const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const WHITE = "#FFFFFF";
const RED = "#FF3B30";

type CalendarItem = { id: string; name: string; portada?: string };
type RecurrenceType = "daily" | "weekly" | "monthly" | "yearly";
type EndType = "never" | "date" | "count";
type EventType = "normal" | "recurring";

const mockCalendars: CalendarItem[] = MOCK_CALENDARS.map((c) => ({
  id: c.id,
  name: c.nombre,
  portada: c.portada,
}));

const pad2 = (n: number) => String(n).padStart(2, "0");

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RECURRENCE_OPTIONS: RecurrenceType[] = ["daily", "weekly", "monthly", "yearly"];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDateParam(param: string | undefined): Date {
  if (param) {
    const [y, m, d] = param.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }
  return new Date();
}

export default function CreateEventsUnifiedScreen() {
  const { width } = useWindowDimensions();
  const { date: dateParam, calendarId: calendarIdParam } = useLocalSearchParams<{ date?: string; calendarId?: string }>();

  const formWidth =
    Platform.OS === "web" ? Math.min(width * 0.58, 820) : Math.min(width * 0.92, 420);

  const THIS_YEAR = new Date().getFullYear();
  const YEAR_LIST = Array.from({ length: 12 }, (_, i) => THIS_YEAR - 1 + i);

  // ===== Event Type =====
  const [eventType, setEventType] = useState<EventType>("normal");
  const [eventTypeModalOpen, setEventTypeModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ===== Common Fields =====
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarItem | null>(() => {
    if (calendarIdParam) {
      const found = mockCalendars.find((c) => c.id === calendarIdParam);
      if (found) return found;
    }
    return mockCalendars[0];
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date>(() => parseDateParam(dateParam as string | undefined));

  // Web date picker
  const [showWebDatePicker, setShowWebDatePicker] = useState(false);
  const [webDay, setWebDay] = useState(startDate.getDate());
  const [webMonth, setWebMonth] = useState(startDate.getMonth());
  const [webYear, setWebYear] = useState(startDate.getFullYear());

  const [time, setTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return d;
  });

  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);
  const [webHour, setWebHour] = useState(time.getHours());
  const [webMinute, setWebMinute] = useState(time.getMinutes());

  // ===== Recurrence Fields =====
  const [recurrence, setRecurrence] = useState<RecurrenceType>("weekly");
  const [recurrenceModalOpen, setRecurrenceModalOpen] = useState(false);
  const [interval, setInterval] = useState("1");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3, 5]);
  const [endType, setEndType] = useState<EndType>("never");
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [endCount, setEndCount] = useState("10");
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // ===== Computed Values =====
  const dateLabel = useMemo(() => {
    return startDate.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [startDate]);

  const timeLabel = useMemo(() => {
    return `${pad2(time.getHours())}:${pad2(time.getMinutes())} h`;
  }, [time]);

  const endDateLabel = useMemo(() => {
    return endDate.toLocaleDateString();
  }, [endDate]);

  // ===== Date Picker =====
  const openDatePicker = () => {
    setWebDay(startDate.getDate());
    setWebMonth(startDate.getMonth());
    setWebYear(startDate.getFullYear());
    setShowWebDatePicker(true);
  };

  const applyWebDate = () => {
    const maxDay = new Date(webYear, webMonth + 1, 0).getDate();
    const safeDay = Math.min(webDay, maxDay);
    setStartDate(new Date(webYear, webMonth, safeDay));
    setShowWebDatePicker(false);
  };

  // ===== Time Picker =====
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

  const onPickEndDate = (_event: any, selected?: Date) => {
    if (Platform.OS !== "ios") setShowEndDatePicker(false);
    if (selected) setEndDate(selected);
  };

  const applyWebTime = () => {
    const d = new Date(time);
    d.setHours(webHour);
    d.setMinutes(webMinute);
    d.setSeconds(0, 0);
    setTime(d);
    setShowWebTimePicker(false);
  };

  // ===== Image Picker =====
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
    }
  };

  // ===== Recurrence Helpers =====
  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // ===== Create Handler =====
  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a title");
      return;
    }

    if (!selectedCalendar) {
      Alert.alert("Validation", "Please select a calendar");
      return;
    }

    if (eventType === "recurring" && recurrence === "weekly" && daysOfWeek.length === 0) {
      Alert.alert("Validation", "Select at least one day of the week");
      return;
    }

    setSaving(true);
    try {
      setTimeout(() => {
        Alert.alert("Success", `${eventType === "recurring" ? "Recurring event" : "Event"} created successfully`);
        setSaving(false);
      }, 800);
    } catch (error) {
      Alert.alert("Error", "Failed to create event");
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={WHITE} />
        </Pressable>
        <Pressable style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="refresh" size={22} color={WHITE} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>New Event</Text>

        <View style={[styles.body, { width: formWidth }]}>
          {/* Event Type Dropdown */}
          <View style={styles.eventTypeDropdownContainer}>
            <Text style={styles.fieldLabel}>Event Type:</Text>
            <Pressable style={styles.input} onPress={() => setEventTypeModalOpen(true)}>
              <Text style={{ color: TEXT, fontWeight: "600" }}>
                {eventType === "normal" ? "Single Event" : "Recurring Event"}
              </Text>
            </Pressable>
          </View>

          {/* Header row: Calendar + Photos */}
          <View style={styles.headerRow}>
            <View style={styles.block}>
              <View style={styles.calendarLabelRow}>
                <Text style={styles.smallLabelInline}>Calendar:</Text>
                <Pressable style={styles.dropdownInline} onPress={() => setCalendarModalOpen(true)}>
                  <Ionicons name="chevron-down" size={18} color={TEXT} />
                </Pressable>
              </View>

              <View style={styles.calendarPreview}>
                <View style={styles.calendarImgWrap}>
                  {selectedCalendar?.portada ? (
                    <Image source={{ uri: selectedCalendar.portada }} style={styles.calendarImg} />
                  ) : (
                    <View style={styles.calendarImgPlaceholder} />
                  )}
                </View>
                <Text style={styles.calendarName}>{selectedCalendar?.name ?? ""}</Text>
              </View>
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

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>Title:</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} />

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Description:</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={styles.textAreaSmall}
              multiline
              textAlignVertical="top"
              scrollEnabled
            />

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Place:</Text>
            <TextInput value={place} onChangeText={setPlace} style={styles.input} />

            {/* Date */}
            <View style={styles.timeRow}>
              <Text style={styles.fieldLabel}>Date:</Text>
              <Pressable style={styles.timePill} onPress={openDatePicker}>
                <Text style={styles.timeText}>{dateLabel}</Text>
              </Pressable>
            </View>

            {/* Time */}
            <View style={styles.timeRow}>
              <Text style={styles.fieldLabel}>Time:</Text>
              <Pressable style={styles.timePill} onPress={openTimePicker}>
                <Text style={styles.timeText}>{timeLabel}</Text>
              </Pressable>
            </View>

            {/* Recurrence Section - Only show if recurring */}
            {eventType === "recurring" && (
              <>
                {/* Recurrence Type */}
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Repeat:</Text>
                <Pressable style={styles.input} onPress={() => setRecurrenceModalOpen(true)}>
                  <Text style={{ color: TEXT, fontWeight: "600" }}>
                    {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                  </Text>
                </Pressable>

                {/* Interval */}
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Every:</Text>
                <View style={styles.intervalRow}>
                  <TextInput
                    value={interval}
                    onChangeText={setInterval}
                    style={styles.intervalInput}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.intervalLabel}>{recurrence}</Text>
                </View>

                {/* Days of Week (if weekly) */}
                {recurrence === "weekly" && (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Days:</Text>
                    <View style={styles.daysGrid}>
                      {DAYS.map((day, index) => (
                        <Pressable
                          key={day}
                          style={[
                            styles.dayButton,
                            daysOfWeek.includes(index) && styles.dayButtonSelected,
                          ]}
                          onPress={() => toggleDayOfWeek(index)}
                        >
                          <Text
                            style={[
                              styles.dayButtonText,
                              daysOfWeek.includes(index) && styles.dayButtonTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {/* End Type */}
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Ends:</Text>
                <View style={styles.endTypeRow}>
                  {(["never", "date", "count"] as const).map((type) => (
                    <Pressable
                      key={type}
                      style={[styles.endTypeBtn, endType === type && styles.endTypeBtnActive]}
                      onPress={() => setEndType(type)}
                    >
                      <Text style={[styles.endTypeText, endType === type && styles.endTypeTextActive]}>
                        {type === "never" ? "Never" : type === "date" ? "On date" : "After"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* End Date */}
                {endType === "date" && (
                  <Pressable style={styles.input} onPress={() => setShowEndDatePicker(true)}>
                    <Text style={{ color: TEXT, fontWeight: "600" }}>{endDateLabel}</Text>
                  </Pressable>
                )}

                {/* End Count */}
                {endType === "count" && (
                  <TextInput
                    value={endCount}
                    onChangeText={setEndCount}
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="Number of occurrences"
                    placeholderTextColor="rgba(16,70,77,0.4)"
                  />
                )}
              </>
            )}

            {/* Calendar placeholder */}
            <View style={styles.calendarCenterWrap}>
              <View style={styles.calendarSquare}>
                <Text style={styles.calendarSquareText}>calendario</Text>
              </View>
            </View>

            <Pressable
              style={[styles.publishBtn, saving && styles.publishBtnDisabled]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#EAF7F6" />
              ) : (
                <Text style={styles.publishText}>
                  {eventType === "recurring" ? "Create" : "Publish"}
                </Text>
              )}
            </Pressable>

            <View style={{ height: 14 }} />
          </View>
        </View>
      </ScrollView>

      {/* Calendar dropdown modal */}
      <Modal visible={calendarModalOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setCalendarModalOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select calendar</Text>
            <FlatList
              data={mockCalendars}
              keyExtractor={(i) => i.id}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCalendar(item);
                    setCalendarModalOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Event Type dropdown modal */}
      <Modal visible={eventTypeModalOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEventTypeModalOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select event type</Text>
            <FlatList
              data={["normal", "recurring"] as const}
              keyExtractor={(i) => i}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setEventType(item);
                    setEventTypeModalOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {item === "normal" ? "Single Event" : "Recurring Event"}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Recurrence dropdown modal */}
      <Modal visible={recurrenceModalOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRecurrenceModalOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select frequency</Text>
            <FlatList
              data={RECURRENCE_OPTIONS}
              keyExtractor={(i) => i}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setRecurrence(item);
                    setRecurrenceModalOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Date picker */}
      {showWebDatePicker && (
        <Modal transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Select date</Text>

              <View style={styles.webTimeRow}>
                {/* Day */}
                <View style={styles.webListBox}>
                  <FlatList
                    data={Array.from({ length: 31 }, (_, i) => i + 1)}
                    keyExtractor={(i) => `d-${i}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item }) => {
                      const sel = item === webDay;
                      return (
                        <Pressable onPress={() => setWebDay(item)} style={[styles.webListItem, sel && styles.webListItemSelected]}>
                          <Text style={[styles.webListItemText, sel && styles.webListItemTextSelected]}>{pad2(item)}</Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>

                {/* Month */}
                <View style={styles.webListBox}>
                  <FlatList
                    data={MONTH_SHORT}
                    keyExtractor={(_, i) => `mo-${i}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item, index }) => {
                      const sel = index === webMonth;
                      return (
                        <Pressable onPress={() => setWebMonth(index)} style={[styles.webListItem, sel && styles.webListItemSelected]}>
                          <Text style={[styles.webListItemText, sel && styles.webListItemTextSelected]}>{item}</Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>

                {/* Year */}
                <View style={styles.webListBox}>
                  <FlatList
                    data={YEAR_LIST}
                    keyExtractor={(y) => `y-${y}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item }) => {
                      const sel = item === webYear;
                      return (
                        <Pressable onPress={() => setWebYear(item)} style={[styles.webListItem, sel && styles.webListItemSelected]}>
                          <Text style={[styles.webListItemText, sel && styles.webListItemTextSelected]}>{item}</Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              </View>

              <View style={styles.webTimeActions}>
                <Pressable style={styles.webCancelBtn} onPress={() => setShowWebDatePicker(false)}>
                  <Text style={styles.webCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.pickerDone} onPress={applyWebDate}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Native time picker (iOS/Android) */}
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

      {/* Web time picker */}
      {showWebTimePicker && (
        <Modal transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Select time</Text>

              <View style={styles.webTimeRow}>
                {/* Hours */}
                <View style={styles.webListBox}>
                  <FlatList
                    data={Array.from({ length: 24 }, (_, i) => i)}
                    keyExtractor={(i) => `h-${i}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item }) => {
                      const selected = item === webHour;
                      return (
                        <Pressable
                          onPress={() => setWebHour(item)}
                          style={[styles.webListItem, selected && styles.webListItemSelected]}
                        >
                          <Text style={[styles.webListItemText, selected && styles.webListItemTextSelected]}>
                            {pad2(item)}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>

                {/* Minutes */}
                <View style={styles.webListBox}>
                  <FlatList
                    data={Array.from({ length: 60 }, (_, i) => i)}
                    keyExtractor={(i) => `m-${i}`}
                    style={styles.webList}
                    contentContainerStyle={styles.webListContent}
                    showsVerticalScrollIndicator
                    renderItem={({ item }) => {
                      const selected = item === webMinute;
                      return (
                        <Pressable
                          onPress={() => setWebMinute(item)}
                          style={[styles.webListItem, selected && styles.webListItemSelected]}
                        >
                          <Text style={[styles.webListItemText, selected && styles.webListItemTextSelected]}>
                            {pad2(item)}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              </View>

              <View style={styles.webTimeActions}>
                <Pressable style={styles.webCancelBtn} onPress={() => setShowWebTimePicker(false)}>
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

      {/* End Date picker */}
      {showEndDatePicker && (
        <>
          {Platform.OS === "ios" ? (
            <Modal transparent animationType="fade">
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerCard}>
                  <Text style={styles.pickerTitle}>Select end date</Text>

                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="spinner"
                    onChange={onPickEndDate}
                  />

                  <Pressable
                    style={styles.pickerDone}
                    onPress={() => setShowEndDatePicker(false)}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="spinner"
              onChange={onPickEndDate}
            />
          )}
        </>
      )}
    </View>
  );
}

const ITEM_H = 20;
const VISIBLE_ITEMS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  topBar: {
    height: 54,
    backgroundColor: TEAL,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { padding: 6 },

  scrollContent: { paddingTop: 6, paddingBottom: 18 },

  header: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    color: TEXT,
    marginTop: 6,
    marginBottom: 6,
  },

  body: { alignSelf: "center" },

  // Event Type Dropdown
  eventTypeDropdownContainer: {
    paddingHorizontal: 6,
    marginBottom: 12,
  },

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
  calendarImg: { width: "100%", height: "100%" },
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

  form: { paddingHorizontal: 6, paddingTop: 4 },

  fieldLabel: { color: TEXT, fontSize: 14, fontWeight: "800", marginBottom: 6 },

  input: {
    height: 34,
    borderWidth: 2,
    borderColor: PINK,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.45)",
    justifyContent: "center",
  },

  photoPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
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

  // Recurrence styles
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  intervalInput: {
    flex: 1,
    height: 34,
    borderWidth: 2,
    borderColor: PINK,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  intervalLabel: { color: TEXT, fontWeight: "600", flex: 2 },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayButton: {
    width: "22%",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PINK,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
  },
  dayButtonSelected: {
    borderColor: PINK,
    backgroundColor: "rgba(242,163,166,0.25)",
  },
  dayButtonText: { color: TEXT, fontWeight: "800", fontSize: 12 },
  dayButtonTextSelected: { color: PINK, fontWeight: "900" },

  endTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  endTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PINK,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
  },
  endTypeBtnActive: {
    borderColor: PINK,
    backgroundColor: "rgba(242,163,166,0.25)",
  },
  endTypeText: { color: TEXT, fontWeight: "700", fontSize: 11 },
  endTypeTextActive: { color: PINK, fontWeight: "900" },

  calendarCenterWrap: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarSquare: {
    width: 240,
    maxWidth: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: "rgba(255,59,48,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarSquareText: { color: TEXT, opacity: 0.65, fontWeight: "900" },

  publishBtn: {
    marginTop: 14,
    alignSelf: "center",
    width: 170,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: TEAL,
    borderWidth: 2,
    borderColor: "#0B3D3D",
    shadowColor: TEAL_DARK,
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishText: { textAlign: "center", color: "#EAF7F6", fontWeight: "900", fontSize: 16 },

  // Modal styles
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

  // Time picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  pickerCard: {
    width: "92%",
    maxWidth: 440,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
  },
  pickerTitle: { color: TEXT, fontWeight: "900", fontSize: 16, marginBottom: 10 },
  pickerDone: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(31,106,106,0.12)",
  },
  pickerDoneText: { color: TEXT, fontWeight: "900" },

  // WEB time picker
  webTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
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
  webListItemSelected: {
    backgroundColor: "rgba(242,163,166,0.18)",
    borderWidth: 1.5,
    borderColor: PINK,
  },
  webListItemText: {
    color: TEXT,
    fontWeight: "800",
  },
  webListItemTextSelected: {
    color: TEXT,
    fontWeight: "900",
  },

  webTimeActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  webCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(16,70,77,0.08)",
  },
  webCancelText: { color: TEXT, fontWeight: "900" },
});
