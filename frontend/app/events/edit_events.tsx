import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import API_CONFIG from "@/constants/api";

const BG = "#FBF7EA";
const TEXT = "#10464D";
const PINK = "#F2A3A6";
const TEAL = "#1F6A6A";
const TEAL_DARK = "#0F4E4F";
const WHITE = "#FFFFFF";
const RED = "#FF3B30";

type CalendarItem = { id: number | string; nombre: string; imagen_portada?: string };

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function EditEventsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = params.id;
  
  const { width } = useWindowDimensions();

  const formWidth =
    Platform.OS === "web" ? Math.min(width * 0.58, 820) : Math.min(width * 0.92, 420);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [time, setTime] = useState<Date>(new Date());

  // Native picker (iOS/Android)
  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);

  // Custom picker (WEB)
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);
  const [webHour, setWebHour] = useState(time.getHours());
  const [webMinute, setWebMinute] = useState(time.getMinutes());

  // Load calendars and event data on mount
  useEffect(() => {
    const initData = async () => {
      console.log("📱 Edit Events Screen Loaded");
      console.log("📥 Event ID from params:", eventId);
      console.log("🔗 API Base URL:", API_CONFIG.BaseURL);
      
      if (!eventId) {
        console.error("❌ No event ID provided!");
        Alert.alert("Error", "No event ID found");
        setLoading(false);
        return;
      }
      
      // Load calendars first
      const loadedCalendars = await loadCalendars();
      
      // Then load event data
      await loadEventData(loadedCalendars);
    };
    initData();
  }, [eventId]);

  const loadCalendars = async () => {
    try {
      console.log("📋 Loading calendars...");
      const url = API_CONFIG.endpoints.getCalendars;
      console.log("📡 Calling:", url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load calendars: ${response.status}`);
      }
      
      const data = await response.json();
      const loadedCalendars = data.calendarios || [];
      console.log("✅ Calendars loaded:", loadedCalendars.length);
      setCalendars(loadedCalendars);
      return loadedCalendars;
    } catch (error) {
      console.error("❌ Error loading calendars:", error);
      Alert.alert("Error", "Failed to load calendars");
      setLoading(false);
      return [];
    }
  };

  const loadEventData = async (availableCalendars: CalendarItem[]) => {
    if (!eventId) {
      Alert.alert("Error", "Event ID is missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const url = API_CONFIG.endpoints.getEvent(eventId);
      console.log("🔍 Fetching event from:", url);
      
      const response = await fetch(url);
      console.log("📊 Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        throw new Error(`Failed to load event: ${response.status}`);
      }
      
      const event = await response.json();
      console.log("✅ Event loaded:", JSON.stringify(event, null, 2));
      
      // Set basic fields
      setTitle(event.titulo || "");
      setDescription(event.descripcion || "");
      setPlace(event.nombre_lugar || "");
      
      console.log("📝 Title:", event.titulo);
      console.log("📝 Description:", event.descripcion);
      console.log("📝 Place:", event.nombre_lugar);
      
      // Parse date
      if (event.fecha) {
        const [year, month, day] = event.fecha.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        setEventDate(dateObj);
        console.log("📅 Date:", dateObj);
        
        // Parse time
        if (event.hora) {
          const [hours, minutes] = event.hora.split(':').map(Number);
          const timeObj = new Date(dateObj);
          timeObj.setHours(hours, minutes, 0, 0);
          setTime(timeObj);
          setWebHour(hours);
          setWebMinute(minutes);
          console.log("⏰ Time:", timeObj);
        }
      }
      
      // Set calendar
      if (event.calendarios && event.calendarios.length > 0) {
        const calendarId = event.calendarios[0];
        console.log("🗓️ Calendar ID:", calendarId);
        setSelectedCalendarId(calendarId);
      }
      
    } catch (error) {
      console.error("❌ Error loading event:", error);
      Alert.alert("Error", "Failed to load event data: " + (error as Error).message);
    } finally {
      setLoading(false);
      console.log("✔️ Loading complete");
    }
  };

  const timeLabel = useMemo(() => {
    return `${pad2(time.getHours())}:${pad2(time.getMinutes())} h`;
  }, [time]);

  const openTimePicker = () => {
    if (Platform.OS === "web") {
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
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a title");
      return;
    }

    if (!selectedCalendarId) {
      Alert.alert("Validation", "Please select a calendar");
      return;
    }

    setSaving(true);
    try {
      const dateStr = `${eventDate.getFullYear()}-${pad2(eventDate.getMonth() + 1)}-${pad2(eventDate.getDate())}`;
      const timeStr = `${pad2(time.getHours())}:${pad2(time.getMinutes())}:00`;
      
      const updateData = {
        titulo: title,
        descripcion: description,
        nombre_lugar: place,
        fecha: dateStr,
        hora: timeStr,
        calendarios: [selectedCalendarId],
      };

      console.log("💾 Saving event:", JSON.stringify(updateData, null, 2));

      const url = API_CONFIG.endpoints.editEvent(eventId!);
      console.log("📡 Calling:", url);

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      console.log("📊 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        throw new Error(`Failed to update event: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Event updated:", result);

      Alert.alert("Success", "Event updated successfully");
      router.replace("/calendars");
    } catch (error) {
      console.error("❌ Error saving event:", error);
      Alert.alert("Error", "Failed to save event: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={WHITE} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </View>
    );
  }

  const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarId);

  return (
    <>
    <Stack.Screen options={{headerShown:false}}/>
    <View style={styles.container}> 
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={WHITE} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>{title || "Edit Event"}</Text>

        <View style={[styles.body, { width: formWidth }]}>
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
                  {selectedCalendar?.imagen_portada ? (
                    <Image source={{ uri: selectedCalendar.imagen_portada }} style={styles.calendarImg} />
                  ) : (
                    <View style={[styles.calendarImgPlaceholder, { backgroundColor: TEAL }]} />
                  )}
                </View>
                <Text style={styles.calendarName}>{selectedCalendar?.nombre ?? "Select calendar"}</Text>
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

            {/* Time */}
            <View style={styles.timeRow}>
              <Text style={styles.fieldLabel}>Time:</Text>
              <Pressable style={styles.timePill} onPress={openTimePicker}>
                <Text style={styles.timeText}>{timeLabel}</Text>
              </Pressable>
            </View>

            {/* Calendar placeholder */}
            <View style={styles.calendarCenterWrap}>
              <View style={styles.calendarSquare}>
                <Text style={styles.calendarSquareText}>calendario</Text>
              </View>
            </View>

            <Pressable 
              style={[styles.updateBtn, saving && styles.updateBtnDisabled]} 
              onPress={handleUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#EAF7F6" />
              ) : (
                <Text style={styles.updateText}>Update</Text>
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
              data={calendars}
              keyExtractor={(i) => String(i.id)}
              ItemSeparatorComponent={() => <View style={styles.modalSep} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCalendarId(item.id);
                    setCalendarModalOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.nombre}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Native time picker (iOS/Android) */}
      {showNativeTimePicker && (
        <>
          {Platform.OS === "ios" ? (
            <Modal transparent animationType="fade">
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerCard}>
                  <Text style={styles.pickerTitle}>Select time</Text>

                  <DateTimePicker value={time} mode="time" display="spinner" onChange={onPickNativeTime} />

                  <Pressable style={styles.pickerDone} onPress={() => setShowNativeTimePicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker value={time} mode="time" display="spinner" onChange={onPickNativeTime} />
          )}
        </>
      )}

      {/* WEB time picker (custom) */}
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
    </View>
    </>
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

  updateBtn: {
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
  updateBtnDisabled: {
    opacity: 0.6,
  },
  updateText: { textAlign: "center", color: "#EAF7F6", fontWeight: "900", fontSize: 16 },

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
