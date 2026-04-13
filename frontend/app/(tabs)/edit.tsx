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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCalendarActions } from "@/hooks/use-calendar-actions";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { appendPhoto } from "@/services/api-client";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import apiClient from "@/services/api-client";

type PrivacyStatus = "PRIVATE" | "PUBLIC";

type CategoryItem = {
  id: number;
  name: string;
  calendars_count?: number;
};

type ApiListResponse<T> = T[] | { results?: T[]; data?: T[] };

const extractArray = <T,>(response: ApiListResponse<T> | null | undefined): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export default function EditScreen() {
  const router = useRouter();
  const { updateCalendar } = useCalendarActions();

  const params = useLocalSearchParams<{
    id: string;
    name: string;
    description: string;
    privacy: PrivacyStatus;
    cover: string;
  }>();

  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyStatus>(
    params.privacy ?? "PRIVATE"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [calendarData, setCalendarData] = useState({
    name: params.name ?? "",
    description: params.description ?? "",
  });

  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(
    params.cover || null
  );
  const [newCoverImage, setNewCoverImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [showRemoveCoverConfirm, setShowRemoveCoverConfirm] = useState(false);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [initialCategoryIds, setInitialCategoryIds] = useState<number[]>([]);

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
    if (!calendarId) return;

    try {
      setCategoriesLoading(true);
      setCategoriesError(null);

      const [allCategoriesResponse, assignedCategoriesResponse] = await Promise.all([
        apiClient.get("/categories/") as Promise<ApiListResponse<CategoryItem>>,
        apiClient.get(`/categories/for-calendar/${calendarId}/`) as Promise<ApiListResponse<CategoryItem>>,
      ]);

      const allCategories = extractArray(allCategoriesResponse);
      const assignedCategories = extractArray(assignedCategoriesResponse);

      const assignedIds = assignedCategories
        .map((c) => Number(c?.id))
        .filter((id) => Number.isFinite(id));

      setCategories(allCategories);
      setSelectedCategoryIds(assignedIds);
      setInitialCategoryIds(assignedIds);
    } catch (error: any) {
      console.error("Error loading calendar categories:", error);
      setCategories([]);
      setSelectedCategoryIds([]);
      setInitialCategoryIds([]);
      setCategoriesError(
        error?.message || "Failed to load calendar categories."
      );
    } finally {
      setCategoriesLoading(false);
    }
  };

  loadCategories();
}, [calendarId]);

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
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setNewCoverImage(result.assets[0]);
      setCoverRemoved(false);
    }
  };

  const handleRemoveCover = () => {
    setShowRemoveCoverConfirm(true);
  };

  const confirmRemoveCover = () => {
    setNewCoverImage(null);
    setExistingCoverUrl(null);
    setCoverRemoved(true);
    setShowRemoveCoverConfirm(false);
  };

  const displayCoverUri = newCoverImage?.uri ?? (coverRemoved ? null : existingCoverUrl);

  const syncCategories = async () => {
    const currentSet = new Set(selectedCategoryIds);
    const initialSet = new Set(initialCategoryIds);

    const toAdd = selectedCategoryIds.filter((id) => !initialSet.has(id));
    const toRemove = initialCategoryIds.filter((id) => !currentSet.has(id));

    const failedAdds: string[] = [];
    const failedRemoves: string[] = [];

    await Promise.all(
      toAdd.map(async (categoryId) => {
        try {
          await apiClient.post(`/categories/${categoryId}/assign_to_calendar/`, {
            calendar_id: Number(calendarId),
          });
        } catch {
          const category = categories.find((c) => c.id === categoryId);
          failedAdds.push(category?.name || `Category ${categoryId}`);
        }
      })
    );

    await Promise.all(
      toRemove.map(async (categoryId) => {
        try {
          await apiClient.post(`/categories/${categoryId}/remove_from_calendar/`, {
            calendar_id: Number(calendarId),
          });
        } catch {
          const category = categories.find((c) => c.id === categoryId);
          failedRemoves.push(category?.name || `Category ${categoryId}`);
        }
      })
    );

    return { failedAdds, failedRemoves };
  };

  const handleEdit = async () => {
    if (!calendarData.name.trim()) {
      Alert.alert("Error", "Calendar name is required.");
      return;
    }

    if (!calendarId) {
      Alert.alert("Error", "Calendar ID is missing.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (newCoverImage) {
        const formData = new FormData();
        formData.append("name", calendarData.name);
        formData.append("description", calendarData.description);
        formData.append("privacy", selectedPrivacy);

        await appendPhoto(formData, newCoverImage, "cover");
        await updateCalendar(Number(calendarId), formData);
      } else {
        const payload: any = {
          name: calendarData.name,
          description: calendarData.description,
          privacy: selectedPrivacy,
        };

        if (coverRemoved) {
          payload.remove_cover = "true";
        }

        await updateCalendar(Number(calendarId), payload);
      }

      const { failedAdds, failedRemoves } = await syncCategories();

      if (failedAdds.length || failedRemoves.length) {
        const parts: string[] = [];

        if (failedAdds.length) {
          parts.push(`Could not add: ${failedAdds.join(", ")}`);
        }
        if (failedRemoves.length) {
          parts.push(`Could not remove: ${failedRemoves.join(", ")}`);
        }

        Alert.alert("Calendar updated", parts.join("\n"));
      }

      router.replace(`/(tabs)/calendars?selectedCalendarId=${calendarId}`);
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
            : "Failed to update calendar. Please try again."
        );
      }

      console.error("Edit error:", error);
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
          !isDesktop && { paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <ThemedText
            type="title"
            lightColor="#10464d"
            darkColor="#10464d"
            style={{ fontFamily: Fonts.rounded, textAlign: "center", marginVertical: 16 }}
          >
            Edit Calendar
          </ThemedText>

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Cover Image</Text>

            {displayCoverUri ? (
              <View style={styles.coverPreviewContainer}>
                <Image source={{ uri: displayCoverUri }} style={styles.coverPreview} />
                <Pressable style={styles.coverRemoveButton} onPress={handleRemoveCover}>
                  <Ionicons name="close-circle" size={26} color="#fff" />
                </Pressable>
                <Pressable style={styles.coverChangeButton} onPress={handlePickImage}>
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                  <Text style={styles.coverChangeText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.coverPickerEmpty} onPress={handlePickImage}>
                <View style={styles.coverPickerIconWrap}>
                  <Ionicons name="image-outline" size={28} color="#10464d" />
                </View>
                <Text style={styles.coverPickerLabel}>Add a cover image</Text>
                <Text style={styles.coverPickerSub}>Recommended: 16:9 ratio</Text>
              </Pressable>
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
              onChangeText={(text) => setCalendarData({ ...calendarData, name: text })}
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
            ) : categories.length === 0 ? (
              <Text style={styles.helperText}>No categories available.</Text>
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
    paddingBottom: 40,
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
  errorText: {
    color: "#d9534f",
    fontSize: 14,
    marginBottom: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});