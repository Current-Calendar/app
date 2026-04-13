import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ConfirmDeleteModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  visible,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const handleCancel = () => {
    if (!loading) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancelButton, loading && styles.disabled]}
              onPress={handleCancel}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.deleteButton, loading && styles.disabled]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: 360,
    maxWidth: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    padding: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10464D",
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: "#2E2E2E",
    lineHeight: 22,
    marginBottom: 18,
  },
  errorText: {
    color: "#B33F37",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  button: {
    minWidth: 110,
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D8D8",
  },
  deleteButton: {
    backgroundColor: "#B33F37",
  },
  cancelText: {
    color: "#10464D",
    fontSize: 14,
    fontWeight: "700",
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.7,
  },
});
