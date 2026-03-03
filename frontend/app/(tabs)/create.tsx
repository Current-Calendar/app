import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, useWindowDimensions, Alert, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter } from "expo-router";
import API_CONFIG from "@/constants/api";
type PrivacyStatus = 'PRIVADO' | 'AMIGOS' | 'PUBLICO';
type CalendarOrigin = 'CURRENT' | 'GOOGLE' | 'APPLE';

interface PublishData {
  nombre: string;
  descripcion: string;
  portada?: string;
  estado: PrivacyStatus;
  origen?: CalendarOrigin;
}
export default function CreateScreen() {
  const router = useRouter();
  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyStatus>('PRIVADO');
  const [selectedOrigin, setSelectedOrigin] = useState<CalendarOrigin>('CURRENT');
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState<PublishData>({
    nombre: "",
    descripcion: "",
    estado: 'PRIVADO',
    origen: 'CURRENT',
  });

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const privacyOptions: { label: string; value: PrivacyStatus; icon: string; description: string }[] = [
    {
      label: "Private",
      value: "PRIVADO",
      icon: "lock-closed-outline",
      description: "Only you can see this calendar",
    },
    {
      label: "Friends",
      value: "AMIGOS",
      icon: "people-outline",
      description: "Visible to your friends only",
    },
    {
      label: "Public",
      value: "PUBLICO",
      icon: "globe-outline",
      description: "Visible to everyone",
    },
  ];

  const handlePublish = async () => {
    if (!calendarData.nombre.trim()) {
      Alert.alert("Error", "Calendar name is required.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(API_CONFIG.endpoints.createCalendar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creador_id: 2, // TODO: replace with real user id when auth is done
          nombre: calendarData.nombre,
          descripcion: calendarData.descripcion,
          estado: selectedPrivacy,
          origen: "CURRENT",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0] ?? 'Unknown error');
      }

      router.replace('/(tabs)/calendars');
    } catch (error) {
      Alert.alert("Error", "Failed to publish calendar. Please try again.");
      console.error("Publish error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraft = async () => {
    try {
      // TODO: Save as draft
      Alert.alert("Success", "Calendar saved as draft");
      console.log("Calendar saved as draft");
    } catch (error) {
      Alert.alert("Error", "Failed to save draft");
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[styles.container, isDesktop && styles.containerDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* FORM CARD */}
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>

          {/* TITLE */}
          <ThemedText
            type="title"
            lightColor="#10464d"
            darkColor="#10464d"
            style={{ fontFamily: Fonts.rounded, textAlign: "center", marginVertical: 16 }}
          >
            Create Calendar
          </ThemedText>

          {/* CALENDAR DETAILS */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Calendar Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Calendar name"
              placeholderTextColor="#aaa"
              value={calendarData.nombre}
              onChangeText={(text) => setCalendarData({ ...calendarData, nombre: text })}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              placeholderTextColor="#aaa"
              value={calendarData.descripcion}
              onChangeText={(text) => setCalendarData({ ...calendarData, descripcion: text })}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* DIVIDER */}
          <View style={styles.divider} />
          <View style={styles.privacySection}>
            <Text style={styles.sectionTitle}>Who can see this?</Text>

            {privacyOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.privacyOption,
                  selectedPrivacy === option.value && styles.privacyOptionSelected,
                ]}
                onPress={() => setSelectedPrivacy(option.value)}
              >
                <View style={styles.privacyIconRadius}>
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={selectedPrivacy === option.value ? "#10464d" : "#999"}
                  />
                </View>
                <View style={styles.privacyContent}>
                  <Text
                    style={[
                      styles.privacyLabel,
                      selectedPrivacy === option.value && styles.privacyLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.privacyDescription}>{option.description}</Text>
                </View>

                {/* Radio Button */}
                <View
                  style={[
                    styles.radioButton,
                    selectedPrivacy === option.value && styles.radioButtonSelected,
                  ]}
                >
                  {selectedPrivacy === option.value && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* INFO BOX */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#10464d" style={{ marginRight: 12 }} />
            <Text style={styles.infoText}>
              {selectedPrivacy === "PRIVADO"
                ? "Only you can access and modify this calendar."
                : selectedPrivacy === "AMIGOS"
                ? "Your friends will receive an invitation to view this calendar."
                : "Anyone with the link can view this calendar."}
            </Text>
          </View>

          {/* ACTION BUTTONS */}
          <View style={[styles.buttonGroup, isDesktop && styles.buttonGroupDesktop]}>
            <Pressable
              style={styles.draftButton}
              onPress={handleDraft}
            >
              <Text style={styles.draftButtonText}>Save as Draft</Text>
            </Pressable>

            {isDesktop && (
              <Pressable
                style={[styles.publishButton, isLoading && styles.publishButtonDisabled]}
                onPress={handlePublish}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.publishText}>Create Calendar</Text>
                )}
              </Pressable>
            )}
          </View>

        </View>
      </ScrollView>

      {/* PUBLISH BUTTON — fixed at bottom on mobile */}
      {!isDesktop && (
        <View style={styles.publishContainer}>
          <Pressable
            style={[styles.publishButton, isLoading && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.publishText}>Create Calendar</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#E8E5D8",
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
    maxWidth: 600,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  // INPUT SECTION
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    color: "#10464d",
    fontWeight: "700",
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
    height: 90,
    textAlignVertical: "top",
  },

  divider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginVertical: 24,
  },

  // SOURCE SECTION
  sourceSection: {
    marginBottom: 24,
  },
  originButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  originBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#c0756a",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  originBtnActive: {
    borderColor: "#10464d",
    backgroundColor: "#f0f5f5",
  },
  originBtnText: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
  },
  originBtnTextActive: {
    color: "#10464d",
  },

  // PRIVACY SECTION
  privacySection: {
    marginBottom: 24,
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  privacyOptionSelected: {
    borderColor: "#10464d",
    backgroundColor: "#f0f5f5",
  },
  privacyIconRadius: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  privacyContent: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginBottom: 2,
  },
  privacyLabelSelected: {
    color: "#10464d",
  },
  privacyDescription: {
    fontSize: 12,
    color: "#999",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    borderColor: "#10464d",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10464d",
  },

  // INFO BOX
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f0f5f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#10464d",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#10464d",
    lineHeight: 16,
  },

  // BUTTONS
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  buttonGroupDesktop: {
    justifyContent: "space-between",
  },
  draftButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#10464d",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  draftButtonText: {
    color: "#10464d",
    fontSize: 15,
    fontWeight: "600",
  },

  publishContainer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
  },
  publishButton: {
    flex: 1,
    backgroundColor: "#10464d",
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
});
