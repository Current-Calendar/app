import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import apiClient from "@/services/api-client";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

type PrivacyStatus = "PRIVADO" | "AMIGOS" | "PUBLICO";

export default function EditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    nombre: string;
    descripcion: string;
    estado: PrivacyStatus;
    portada: string;
  }>();

  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyStatus>(
    params.estado ?? "PRIVADO"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState({
    nombre: params.nombre ?? "",
    descripcion: params.descripcion ?? "",
  });

  const [coverImage, setCoverImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [existingPortada, setExistingPortada] = useState<string | null>(() => {
    const p = params.portada;
    if (!p || p === 'null' || p === 'undefined' || p.trim() === '') return null;
    return p;
  });
  const [removePortada, setRemovePortada] = useState(false);

  const calendarId = params.id;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const privacyOptions: {
    label: string;
    value: PrivacyStatus;
    icon: string;
    description: string;
  }[] = [
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

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setCoverImage(result.assets[0]);
      setRemovePortada(false);
    }
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    setExistingPortada(null);
    setRemovePortada(true);
  };

  const handleEdit = async () => {
    if (!calendarData.nombre.trim()) {
      Alert.alert("Error", "Calendar name is required.");
      return;
    }

    if (!calendarId) {
      Alert.alert("Error", "Calendar ID is missing.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("nombre", calendarData.nombre);
      formData.append("descripcion", calendarData.descripcion);
      formData.append("estado", selectedPrivacy);

      if (coverImage) {
        const mimeType = coverImage.mimeType ?? "image/jpeg";
        const extFromMime: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/jpg": ".jpg",
          "image/png": ".png",
          "image/gif": ".gif",
          "image/webp": ".webp",
          "image/heic": ".heic",
        };
        const ext = extFromMime[mimeType] ?? ".jpg";
        const rawName = coverImage.uri.split("/").pop() ?? "cover";
        const filename = rawName.includes(".") ? rawName : rawName + ext;

        const fetchResponse = await fetch(coverImage.uri);
        const blob = await fetchResponse.blob();
        const file = new File([blob], filename, { type: mimeType });
        formData.append("portada", file, filename);
      } else if (removePortada) {
        formData.append("remove_portada", "true");
      }

      await apiClient.put(
        `/calendarios/${Number(calendarId)}/editar/`,
        formData
      );

      router.replace("/(tabs)/calendars");
    } catch (error) {
      Alert.alert("Error", "Failed to update calendar. Please try again.");
      console.error("Edit error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const previewUri = coverImage ? coverImage.uri : existingPortada;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          isDesktop && styles.containerDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* FORM CARD */}
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>

          {/* TITLE */}
          <ThemedText
            type="title"
            lightColor="#10464d"
            darkColor="#10464d"
            style={{
              fontFamily: Fonts.rounded,
              textAlign: "center",
              marginVertical: 16,
            }}
          >
            Edit Calendar
          </ThemedText>

          {/* COVER IMAGE */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Cover Image</Text>

            {previewUri ? (
              <View style={styles.coverPreviewContainer}>
                <Image
                  source={{ uri: previewUri }}
                  style={styles.coverPreview}
                />
                <Pressable
                  style={styles.coverRemoveButton}
                  onPress={handleRemoveCover}
                >
                  <Ionicons name="close-circle" size={26} color="#fff" />
                </Pressable>
                <Pressable
                  style={styles.coverChangeButton}
                  onPress={handlePickImage}
                >
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                  <Text style={styles.coverChangeText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.coverPickerEmpty}
                onPress={handlePickImage}
              >
                <View style={styles.coverPickerIconWrap}>
                  <Ionicons name="image-outline" size={28} color="#10464d" />
                </View>
                <Text style={styles.coverPickerLabel}>Add a cover image</Text>
                <Text style={styles.coverPickerSub}>
                  Recommended: 16:9 ratio
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.divider} />

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

          {/* PRIVACY */}
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

          {/* DESKTOP BUTTON */}
          {isDesktop && (
            <Pressable
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleEdit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </Pressable>
          )}

        </View>
      </ScrollView>

      {/* SAVE BUTTON — fixed at bottom on mobile */}
      {!isDesktop && (
        <View style={styles.saveContainer}>
          <Pressable
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleEdit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Save Changes</Text>
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

  // COVER IMAGE
  coverPreviewContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  coverPreview: {
    width: "100%",
    height: "100%",
  },
  coverRemoveButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 13,
  },
  coverChangeButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  coverChangeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  coverPickerEmpty: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#c5dde0",
    borderStyle: "dashed",
    backgroundColor: "#f0f9fa",
    alignItems: "center",
    justifyContent: "center",
  },
  coverPickerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#d8eef0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  coverPickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10464d",
    marginBottom: 4,
  },
  coverPickerSub: {
    fontSize: 12,
    color: "#888",
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
  saveContainer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
  },
  saveButton: {
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts?.rounded,
  },
});
