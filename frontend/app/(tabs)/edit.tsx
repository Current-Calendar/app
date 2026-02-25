import { View, Text, ScrollView, TextInput, Switch, Pressable, StyleSheet, useWindowDimensions, Alert } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function EditScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleDelete = () => {
    Alert.alert(
      "Delete Calendar",
      "Are you sure you want to delete this calendar? This action cannot be undone.",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => {
            // TODO: Implement delete logic
            console.log("Calendar deleted");
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a calendar title");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement update logic
      console.log("Calendar updated:", { title, description, isPrivate });
      Alert.alert("Success", "Calendar updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update calendar");
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
            Edit Calendar
          </ThemedText>

          {/* COVER */}
          <View style={styles.coverRow}>
            <Text style={styles.label}>Cover:</Text>
            <Pressable style={styles.coverBox}>
              <Ionicons name="camera-outline" size={44} color="#aaa" />
              <Text style={styles.coverHint}>Tap to change</Text>
            </Pressable>
          </View>

          {/* TITLE INPUT */}
          <Text style={styles.label}>Title:</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Calendar name..."
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

          {/* PRIVATE + FRIENDS ROW */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>Private</Text>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: "#ccc", true: "#10464d" }}
                thumbColor="#fff"
              />
            </View>

            <Pressable style={styles.friendsButton}>
              <Ionicons name="people-outline" size={16} color="#10464d" style={{ marginRight: 6 }} />
              <Text style={styles.friendsButtonText}>Friends</Text>
            </Pressable>
          </View>

          {/* DELETE BUTTON */}
          <Pressable 
            style={[styles.deleteButton, { marginTop: 16 }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={16} color="#c0756a" style={{ marginRight: 6 }} />
            <Text style={styles.deleteButtonText}>Delete Calendar</Text>
          </Pressable>

          {/* UPDATE BUTTON — inside card on desktop, absolute on mobile */}
          {isDesktop && (
            <Pressable 
              style={[styles.updateButton, { marginTop: 32 }]}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              <Text style={styles.updateText}>{isLoading ? "Saving..." : "Save Changes"}</Text>
            </Pressable>
          )}

        </View>
      </ScrollView>

      {/* UPDATE BUTTON — fixed at bottom on mobile only */}
      {!isDesktop && (
        <View style={styles.updateContainer}>
          <Pressable 
            style={styles.updateButton}
            onPress={handleUpdate}
            disabled={isLoading}
          >
            <Text style={styles.updateText}>{isLoading ? "Saving..." : "Save Changes"}</Text>
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

  // DELETE BUTTON
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#c0756a",
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  deleteButtonText: {
    color: "#c0756a",
    fontSize: 15,
    fontWeight: "600",
  },

  // UPDATE
  updateContainer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
  },
  updateButton: {
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
  updateText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts?.rounded,
  },
});
