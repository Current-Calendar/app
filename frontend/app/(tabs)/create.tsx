import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, useWindowDimensions, Alert, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

type PrivacyStatus = 'PRIVADO' | 'AMIGOS' | 'PUBLICO';
type CalendarOrigin = 'CURRENT' | 'GOOGLE' | 'APPLE';

export default function CreateScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>('PRIVADO');
  const [origin, setOrigin] = useState<CalendarOrigin>('CURRENT');
  const [isLoading, setIsLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const privacyOptions: { label: string; value: PrivacyStatus; icon: string }[] = [
    { label: "Private", value: "PRIVADO", icon: "lock-closed-outline" },
    { label: "Friends", value: "AMIGOS", icon: "people-outline" },
    { label: "Public", value: "PUBLICO", icon: "globe-outline" },
  ];

  const originOptions: { label: string; value: CalendarOrigin }[] = [
    { label: "Current", value: "CURRENT" },
    { label: "Google", value: "GOOGLE" },
    { label: "Apple", value: "APPLE" },
  ];

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a calendar title");
      return;
    }

    setIsLoading(true);
    try {
      const createPayload = {
        nombre: title,
        descripcion: description,
        estado: privacyStatus,
        origen: origin,
      };

      console.log("Creating calendar:", createPayload);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert("Success", "Calendar created successfully!", [
        {
          text: "OK",
          onPress: () => {
            console.log("Navigate to calendar detail");
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to create calendar. Please try again.");
      console.error("Create error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[styles.container, isDesktop && styles.containerDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* FORM CARD — centered on desktop */}
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>

          {/* TITLE */}
          <ThemedText
            type="title"
            lightColor="#10464d"
            darkColor="#10464d"
            style={{ fontFamily: Fonts.rounded, textAlign: "center", marginVertical: 16 }}
          >
            New Calendar
          </ThemedText>

          {/* COVER */}
          <View style={styles.coverRow}>
            <Text style={styles.label}>Cover:</Text>
            <Pressable style={styles.coverBox}>
              <Ionicons name="camera-outline" size={44} color="#aaa" />
              <Text style={styles.coverHint}>Tap to upload</Text>
            </Pressable>
          </View>

          {/* TITLE INPUT */}
          <Text style={styles.label}>Title:</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Give your calendar a name..."
            placeholderTextColor="#bbb"
          />

          {/* DESCRIPTION INPUT */}
          <Text style={styles.label}>Description:</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this calendar about?"
            placeholderTextColor="#bbb"
            multiline
            numberOfLines={4}
          />

          {/* ORIGIN */}
          <Text style={styles.label}>Calendar Source:</Text>
          <View style={styles.originButtons}>
            {originOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.originBtn,
                  origin === option.value && styles.originBtnActive,
                ]}
                onPress={() => setOrigin(option.value)}
              >
                <Text
                  style={[
                    styles.originBtnText,
                    origin === option.value && styles.originBtnTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* PRIVACY SETTING */}
          <Text style={styles.label}>Privacy:</Text>
          <View style={styles.privacyButtons}>
            {privacyOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.privacyBtn,
                  privacyStatus === option.value && styles.privacyBtnActive,
                ]}
                onPress={() => setPrivacyStatus(option.value)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={16}
                  color={privacyStatus === option.value ? "#10464d" : "#999"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.privacyBtnText,
                    privacyStatus === option.value && styles.privacyBtnTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* CREATE BUTTON — inside card on desktop, absolute on mobile */}
          {isDesktop && (
            <Pressable 
              style={[styles.publishButton, { marginTop: 32 }, isLoading && styles.publishButtonDisabled]}
              onPress={handleCreate}
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
      </ScrollView>

      {/* CREATE BUTTON — fixed at bottom on mobile only */}
      {!isDesktop && (
        <View style={styles.publishContainer}>
          <Pressable 
            style={[styles.publishButton, isLoading && styles.publishButtonDisabled]}
            onPress={handleCreate}
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
    paddingBottom: 120,
  },
  containerDesktop: {
    alignItems: "center",
    paddingVertical: 40,
    paddingBottom: 40,
  },

  // CARD (wraps the form)
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

  // COVER
  coverRow: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  coverBox: {
    width: 140,
    height: 140,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#aaa",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 6,
  },
  coverHint: {
    fontSize: 12,
    color: "#aaa",
  },

  // INPUTS
  label: {
    fontSize: 13,
    color: "#10464d",
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
  },
  toggleLabel: {
    fontSize: 15,
    color: "#10464d",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#c0756a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  // ORIGIN BUTTONS
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

  // PRIVACY BUTTONS
  privacyButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  privacyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#c0756a",
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  privacyBtnActive: {
    borderColor: "#10464d",
    backgroundColor: "#f0f5f5",
  },
  privacyBtnText: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
  },
  privacyBtnTextActive: {
    color: "#10464d",
  },

  // TOGGLES
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  friendsButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#10464d",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#f0f5f5",
  },
  friendsButtonText: {
    color: "#10464d",
    fontSize: 14,
    fontWeight: "600",
  },

  // PUBLISH
  publishContainer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
  },
  publishButton: {
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