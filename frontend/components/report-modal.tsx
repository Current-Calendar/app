import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { useReports, ReportReason } from "@/hooks/use-reports";

const REASONS: { label: string; value: ReportReason }[] = [
  { label: "Inappropriate content", value: "INAPPROPRIATE_CONTENT" },
  { label: "Spam", value: "SPAM" },
  { label: "Abusive behavior", value: "ABUSIVE_BEHAVIOR" },
  { label: "Other", value: "OTHER" },
];

type Props = {
  visible: boolean;
  resourceId: string;
  resourceType: "CALENDAR" | "EVENT";
  onClose: () => void;
};

export function ReportModal({ visible, resourceId, resourceType, onClose }: Props) {
  const { submitReport, loading } = useReports();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!reason) return;

    try {
      await submitReport({
        resource_type: resourceType,
        resource_id: Number(resourceId),
        reason,
        description,
      });

      Alert.alert(
        "Report submitted",
        "Thank you. Our team will review this report.",
        [{ text: "OK", onPress: onClose }]
      );
    } catch {
      Alert.alert("Error", "Could not submit report.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Report {resourceType.toLowerCase()}</Text>

          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              onPress={() => setReason(r.value)}
              style={[
                styles.reasonOption,
                reason === r.value && styles.reasonOptionSelected,
              ]}
            >
              <Text style={styles.reasonLabel}>{r.label}</Text>
            </TouchableOpacity>
          ))}

          {reason === "OTHER" && (
            <TextInput
              placeholder="Describe the issue"
              value={description}
              onChangeText={setDescription}
              multiline
              style={styles.descriptionInput}
            />
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!reason || loading}
            style={styles.submitBtn}
          >
            <Text style={styles.submitBtnText}>Submit Report</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "90%",
    maxWidth: 440,
    backgroundColor: "#f7f6f2",
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10464D",
    marginBottom: 12,
  },
  reasonOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(16,70,77,0.15)",
    marginBottom: 10,
  },
  reasonOptionSelected: {
    backgroundColor: "#10464d15",
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10464D",
  },
  descriptionInput: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 80,
    fontSize: 14,
    color: "#10464D",
    marginBottom: 12,
  },
  submitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#10464D",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#fff",
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#10464D",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#10464D",
  },
});