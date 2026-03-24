import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useReport, ReportedType, ReportReason } from '@/hooks/use-reports';
import { reportStyles as styles } from '@/styles/report-styles';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reportedType: ReportedType;
  reportedId: number;
  reportedLabel?: string;
}

const REASON_LABELS: Record<ReportReason, string> = {
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  OTHER: 'Other',
};

const TYPE_LABELS: Record<ReportedType, string> = {
  USER: 'user',
  EVENT: 'event',
  CALENDAR: 'calendar',
};

export function ReportModal({
  open,
  onClose,
  onSuccess,
  reportedType,
  reportedId,
  reportedLabel,
}: ReportModalProps) {
  const { loading, submitReport, getRemainingCooldown, canReport } = useReport();

  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [cooldownMsg, setCooldownMsg] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;

    setReason('');
    setDescription('');
    setFieldError(null);
    setSubmitted(false);

    const remaining = getRemainingCooldown(reportedType, reportedId);
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60_000);
      setCooldownMsg(
        `You have already reported this ${TYPE_LABELS[reportedType]} recently. You can report it again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`
      );
    } else {
      setCooldownMsg(null);
    }
  }, [open, reportedType, reportedId, getRemainingCooldown]);

  const handleSubmit = async () => {
    if (!reason) {
      setFieldError('Please select a reason.');
      return;
    }
    if (!reportedType || !reportedId) {
      setFieldError('Missing report target. Please try again.');
      return;
    }
    setFieldError(null);

    const id = Number(reportedId);
    const payload: Parameters<typeof submitReport>[0] = {
      reported_type: reportedType,
      reason: reason as ReportReason,
      description: description.trim() || undefined,
      ...(reportedType === 'USER' && { reported_user: id }),
      ...(reportedType === 'EVENT' && { reported_event: id }),
      ...(reportedType === 'CALENDAR' && { reported_calendar: id }),
    };

    try {
      await submitReport(payload);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2500);
    } catch (err: any) {
      setFieldError(err?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const isCoolingDown = !canReport(reportedType, reportedId);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>

          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconWrapper}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Report submitted!</Text>
              <Text style={styles.successBody}>
                Thank you for helping us keep the community safe. We will review
                your report as soon as possible.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>
                Report {TYPE_LABELS[reportedType]}
                {reportedLabel ? ` · ${reportedLabel}` : ''}
              </Text>

              {isCoolingDown && cooldownMsg ? (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeIcon}>⏳</Text>
                  <Text style={styles.noticeText}>{cooldownMsg}</Text>
                </View>
              ) : (
                <>
                  {(Object.keys(REASON_LABELS) as ReportReason[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.reasonOption,
                        reason === r && styles.reasonOptionSelected,
                      ]}
                      onPress={() => setReason(r)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.reasonLabel}>{REASON_LABELS[r]}</Text>
                    </TouchableOpacity>
                  ))}

                  <TextInput
                    style={styles.descriptionInput}
                    placeholder="Additional description (optional)…"
                    placeholderTextColor="#10464D80"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <Text style={styles.charCount}>{description.length}/500</Text>

                  {fieldError && (
                    <Text style={styles.errorText}>⚠ {fieldError}</Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      (loading || !reason) && styles.submitBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={loading || !reason}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitBtnText}>
                      {loading ? 'Sending…' : 'Submit report'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}