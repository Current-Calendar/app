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
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useCalendarActions } from "@/hooks/use-calendar-actions";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { appendPhoto } from '@/services/api-client';

type PrivacyStatus = "PRIVATE" | "FRIENDS" | "PUBLIC";
type CalendarOrigin = "CURRENT" | "GOOGLE" | "APPLE";

interface PublishData {
  name: string;
  description: string;
  cover?: string;
  privacy: PrivacyStatus;
  origin?: CalendarOrigin;
}

type CreatedCalendarResponse = {
  id?: number | string;
};

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createCalendar } = useCalendarActions();
  const [selectedPrivacy, setSelectedPrivacy] =
    useState<PrivacyStatus>("PRIVATE");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<PublishData>({
    name: "",
    description: "",
    privacy: "PRIVATE",
    origin: "CURRENT",
  });
  const [coverImage, setCoverImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

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
      value: "PRIVATE",
      icon: "lock-closed-outline",
      description: "Only you can see this calendar",
    },
    {
      label: "Friends",
      value: "FRIENDS",
      icon: "people-outline",
      description: "Visible to your friends only",
    },
    {
      label: "Public",
      value: "PUBLIC",
      icon: "globe-outline",
      description: "Visible to everyone",
    },
  ];

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library.",
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
    }
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
  };

  const handlePublish = async () => {
    if (!calendarData.name.trim()) {
      Alert.alert("Error", "Calendar name is required.");
      return;
    }

    if (!user?.username) {
      Alert.alert("Error", "You must be logged in to create a calendar.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();

      formData.append("name", calendarData.name);
      formData.append("description", calendarData.description);
      formData.append("privacy", selectedPrivacy);
      formData.append("origin", "CURRENT");

      if (coverImage) {
        await appendPhoto(formData, coverImage, "cover");
      }

      const createdCalendar = await createCalendar(formData) as CreatedCalendarResponse;
      const createdCalendarId = createdCalendar?.id;

      Alert.alert("Success", "Calendar created successfully.");

      if (createdCalendarId !== undefined && createdCalendarId !== null) {
        router.replace(`/(tabs)/calendars?selectedCalendarId=${encodeURIComponent(String(createdCalendarId))}`);
      } else {
        router.replace("/(tabs)/calendars");
      }

    } catch (error: any) {
      console.log("FULL ERROR:", error);

      const backendErrors = error?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        setErrorMessage(String(backendErrors[0]));
      } else {
        const message = error?.message || "";
        setErrorMessage(
          message && !message.includes("HTTP")
            ? message
            : "Failed to publish calendar. Please try again."
        );
      }

      console.error("Publish error:", error);
    } finally {
      setIsLoading(false);
    }
  };


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
            Create Calendar
          </ThemedText>

          {/* COVER IMAGE */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Cover Image</Text>

            {coverImage ? (
              <View style={styles.coverPreviewContainer}>
                <Image
                  source={{ uri: coverImage.uri }}
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

          {/* DIVIDER */}
          <View style={styles.divider} />

          {/* CALENDAR DETAILS */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Calendar Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Calendar name"
              placeholderTextColor="#aaa"
              value={calendarData.name}
              onChangeText={(text) =>
                setCalendarData({ ...calendarData, name: text })
              }
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              placeholderTextColor="#aaa"
              value={calendarData.description}
              onChangeText={(text) =>
                setCalendarData({ ...calendarData, description: text })
              }
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
                  selectedPrivacy === option.value &&
                    styles.privacyOptionSelected,
                ]}
                onPress={() => setSelectedPrivacy(option.value)}
              >
                <View style={styles.privacyIconRadius}>
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={
                      selectedPrivacy === option.value ? "#10464d" : "#999"
                    }
                  />
                </View>
                <View style={styles.privacyContent}>
                  <Text
                    style={[
                      styles.privacyLabel,
                      selectedPrivacy === option.value &&
                        styles.privacyLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.privacyDescription}>
                    {option.description}
                  </Text>
                </View>

                {/* Radio Button */}
                <View
                  style={[
                    styles.radioButton,
                    selectedPrivacy === option.value &&
                      styles.radioButtonSelected,
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
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#10464d"
              style={{ marginRight: 12 }}
            />
            <Text style={styles.infoText}>
              {selectedPrivacy === "PRIVATE"
                ? "Only you can access and modify this calendar."
                : selectedPrivacy === "FRIENDS"
                  ? "Your friends will receive an invitation to view this calendar."
                  : "Anyone with the link can view this calendar."}
            </Text>
          </View>
     

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          )}

          {/* ACTION BUTTONS */}
          <View
            style={[styles.buttonGroup, { flexDirection: width < 380 ? "column" : "row" }]}
          >

            <Pressable
              style={[
                styles.publishButton,
                isLoading && styles.publishButtonDisabled,
              ]}
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
        </View>
      </ScrollView>


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
    color: "#10464d",
    fontWeight: "600",
  },
  coverPickerSub: {
    fontSize: 12,
    color: "#999",
  },
  coverPreviewContainer: {
    borderRadius: 12,
    overflow: "hidden",
    height: 160,
    position: "relative",
  },
  coverPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
  color: "#d9534f",
  fontSize: 14,
  marginBottom: 16,
  fontWeight: "600",
  textAlign: "center",
},
});
