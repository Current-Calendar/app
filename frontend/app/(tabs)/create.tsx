import { View, Text, ScrollView, TextInput, Switch, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function CreateScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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

          {/* PUBLISH BUTTON — inside card on desktop, absolute on mobile */}
          {isDesktop && (
            <Pressable style={[styles.publishButton, { marginTop: 32 }]}>
              <Text style={styles.publishText}>Publish</Text>
            </Pressable>
          )}

        </View>
      </ScrollView>

      {/* PUBLISH BUTTON — fixed at bottom on mobile only */}
      {!isDesktop && (
        <View style={styles.publishContainer}>
          <Pressable style={styles.publishButton}>
            <Text style={styles.publishText}>Publish</Text>
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
  publishText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts?.rounded,
  },
});