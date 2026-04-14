import React from "react";
import { Modal, Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const TEXT = "#10464d";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function EventSuccessModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.successOverlay} onPress={onClose}>
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={28} color="#fff" />
          </View>

          <Text style={styles.successTitle}>Success</Text>
          <Text style={styles.successBody} testID="create-event-success-text">
            Event created successfully
          </Text>

          <Pressable
            style={styles.successBtn}
            onPress={onClose}
            testID="create-event-success-ok-button"
          >
            <Text style={styles.successBtnText}>OK</Text>
          </Pressable>

          <Pressable style={styles.successClose} onPress={onClose}>
            <Ionicons name="close" size={18} color={TEXT} />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.30)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  successCard: {
    width: "92%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: "center",
  },
  successIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: TEXT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  successTitle: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 4,
  },
  successBody: {
    color: TEXT,
    textAlign: "center",
    marginBottom: 14,
    opacity: 0.8,
  },
  successBtn: {
    width: 150,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: TEXT,
  },
  successBtnText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "700",
  },
  successClose: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
});