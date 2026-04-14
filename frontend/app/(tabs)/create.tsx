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
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/hooks/use-auth";
import { useCalendarActions } from "@/hooks/use-calendar-actions";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { appendPhoto } from "@/services/api-client";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import apiClient from "@/services/api-client";

type PrivacyStatus = "PRIVATE" | "PUBLIC";
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

type CategoryItem = {
  id: number;
  name: string;
  calendars_count?: number;
};

export default function CreateScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
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
  const [showRemoveCoverConfirm, setShowRemoveCoverConfirm] = useState(false);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

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
      label: "Public",
      value: "PUBLIC",
      icon: "globe-outline",
      description: "Visible to everyone",
    },
  ];

  const selectedCategories = useMemo(
    () => categories.filter((c) => selectedCategoryIds.includes(c.id)),
    [categories, selectedCategoryIds]
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);

        const response: any = await apiClient.get("/categories/");
        const list =
          (Array.isArray(response) && response) ||
          (Array.isArray(response?.results) && response.results) ||
          (Array.isArray(response?.data) && response.data) ||
          [];
        
        console.log("CATEGORIES RESPONSE:", response);
        console.log("CATEGORIES LIST:", list);
        setCategories(list);
      } catch (error: any) {
        console.error("Error loading categories:", error);
        setCategories([]);
        setCategoriesError(
          error?.message || "Failed to load calendar categories."
        );
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  const toggleCategory = (categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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
      const asset = result.assets[0];
      const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB = 3 * 1024 * 1024 bytes (3,145,728 bytes) 
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        setImageError("The selected image is too large. Please choose one under 3MB.");
        return;
      }
      setImageError(null);
      setCoverImage(asset);
    }
  };

  const handleRemoveCover = () => {
    setShowRemoveCoverConfirm(true);
  };

  const confirmRemoveCover = () => {
    setCoverImage(null);
    setShowRemoveCoverConfirm(false);
  };

  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace("/(tabs)/calendars");
    }
  };

  const assignCategoriesToCalendar = async (
    calendarId: number | string,
    categoryIds: number[]
  ) => {
    const failures: string[] = [];

    await Promise.all(
      categoryIds.map(async (categoryId) => {
        try {
          await apiClient.post(`/categories/${categoryId}/assign_to_calendar/`, {
            calendar_id: Number(calendarId),
          });
        } catch (error: any) {
          const category = categories.find((c) => c.id === categoryId);
          failures.push(category?.name || `Category ${categoryId}`);
        }
      })
    );

    return failures;
  };

  const handlePublish = async () => {
    if (!calendarData.name.trim()) {
      setErrorMessage("Calendar name is required.");
      Alert.alert("Error", "Calendar name is required.");
      return;
    }

    if (!user?.username) {
      setErrorMessage("You must be logged in to create a calendar.");
      Alert.alert("Error", "You must be logged in to create a calendar.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();

      formData.append("name", calendarData.name.trim());
      formData.append("description", calendarData.description);
      formData.append("privacy", selectedPrivacy);
      formData.append("origin", "CURRENT");

      if (coverImage) {
        await appendPhoto(formData, coverImage, "cover");
      }

      const createdCalendar = (await createCalendar(
        formData
      )) as CreatedCalendarResponse;

      const createdCalendarId = createdCalendar?.id;

      if (
        createdCalendarId !== undefined &&
        createdCalendarId !== null &&
        selectedCategoryIds.length > 0
      ) {
        const failedCategories = await assignCategoriesToCalendar(
          createdCalendarId,
          selectedCategoryIds
        );

        if (failedCategories.length > 0) {
          Alert.alert(
            "Calendar created",
            `The calendar was created, but these categories could not be assigned: ${failedCategories.join(", ")}`
          );
        } else {
          Alert.alert("Success", "Calendar created successfully.");
        }
      } else {
        Alert.alert("Success", "Calendar created successfully.");
      }

      if (createdCalendarId !== undefined && createdCalendarId !== null) {
        router.replace(
          `/(tabs)/calendars?selectedCalendarId=${encodeURIComponent(
            String(createdCalendarId)
          )}`
        );
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
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <ThemedText
            type="title"
            lightColor="#10464d"
            darkColor="#10464d"
            style={{
              textAlign: "center",
              marginVertical: 16,
            }}
          >
            Create Calendar
          </ThemedText>

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
            {!!imageError && (
              <Text style={{ color: "#d9534f", fontSize: 13, marginTop: 8 }}>
                {imageError}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Calendar Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Calendar name"
              placeholderTextColor="#aaa"
              maxLength={100}
              value={calendarData.name}
              onChangeText={(text) =>
                setCalendarData({ ...calendarData, name: text })
              }
              testID="create-calendar-name-input"
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
              testID="create-calendar-description-input"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Categories</Text>

            <Text style={styles.sectionSubtitle}>
              Select one or more categories for this calendar
            </Text>

            {categoriesLoading ? (
              <View style={styles.categoriesLoading}>
                <ActivityIndicator color="#10464d" />
              </View>
            ) : categoriesError ? (
              <Text style={styles.errorText}>{categoriesError}</Text>
            ) : (
              <View style={styles.categoriesWrap}>
                {categories.map((category) => {
                  const selected = selectedCategoryIds.includes(category.id);

                  return (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipSelected,
                      ]}
                      onPress={() => toggleCategory(category.id)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="#10464d"
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {!!selectedCategories.length && (
              <Text style={styles.helperText}>
                Selected: {selectedCategories.map((c) => c.name).join(", ")}
              </Text>
            )}
          </View>

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
                : "Anyone with the link can view this calendar."}
            </Text>
          </View>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <View
            style={[
              styles.buttonGroup,
              { flexDirection: width < 380 ? "column" : "row" },
            ]}
          >
            <Pressable
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isLoading}
              testID="create-calendar-cancel-button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[
                styles.publishButton,
                isLoading && styles.publishButtonDisabled,
              ]}
              onPress={handlePublish}
              disabled={isLoading}
              testID="create-calendar-submit-button"
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

      <ConfirmDeleteModal
        visible={showRemoveCoverConfirm}
        title="Remove cover image"
        message="Are you sure you want to remove this cover image?"
        confirmLabel="Remove"
        onCancel={() => setShowRemoveCoverConfirm(false)}
        onConfirm={confirmRemoveCover}
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
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    color: "#10464d",
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
    height: 90,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginVertical: 24,
  },
  categoriesLoading: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#d8e6e7",
    backgroundColor: "#f7fbfb",
  },
  categoryChipSelected: {
    borderColor: "#10464d",
    backgroundColor: "#e8f2f2",
  },
  categoryChipText: {
    color: "#10464d",
    fontSize: 13,
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    fontWeight: "700",
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: "#6b6b6b",
  },
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
    borderColor: "#10464d",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cancelText: {
    color: "#10464d",
    fontSize: 18,
    fontWeight: "bold",
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