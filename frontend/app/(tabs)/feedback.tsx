import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient, { ApiError } from '@/services/api-client';
import profileStyles from '../../styles/profile-styles';

type FeedbackType = 'INCIDENCIA' | 'BUG' | 'MEJORA';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; description: string; icon: string }[] = [
  { value: 'INCIDENCIA', label: 'Incidencia', description: 'Algo no funciona como se espera', icon: 'warning-outline' },
  { value: 'BUG', label: 'Bug', description: 'Error concreto en la aplicación', icon: 'bug-outline' },
  { value: 'MEJORA', label: 'Mejora', description: 'Sugerencia para mejorar la app', icon: 'bulb-outline' },
];

const MAX_DESCRIPTION = 1000;

const FeedbackScreen = () => {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = selectedType !== null && description.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/feedback/', {
        type: selectedType,
        description: description.trim(),
      });
      setSubmitted(true);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'No se pudo enviar el feedback. Inténtalo de nuevo.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={profileStyles.editHeaderGreen}>
          <View style={profileStyles.editHeaderRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={profileStyles.editHeaderButton}>Back</Text>
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </View>
        </View>
        <View style={profileStyles.editHeaderCoral} />
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#10464d" />
          </View>
          <Text style={styles.successTitle}>Gracias por tu feedback</Text>
          <Text style={styles.successBody}>
            Hemos recibido tu mensaje. Lo revisaremos lo antes posible.
          </Text>
          <TouchableOpacity style={styles.submitButton} onPress={() => router.back()}>
            <Text style={styles.submitButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={profileStyles.editHeaderGreen}>
        <View style={profileStyles.editHeaderRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={profileStyles.editHeaderButton}>Back</Text>
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
      </View>
      <View style={profileStyles.editHeaderCoral} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrap}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Help us improve</Text>
            <Text style={styles.title}>Send feedback</Text>
            <Text style={styles.heroBody}>
              Cuéntanos qué ha pasado o qué podemos mejorar.
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Tipo de reporte</Text>
            {FEEDBACK_TYPES.map((item, index) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.typeRow,
                  index < FEEDBACK_TYPES.length - 1 && styles.rowBorder,
                  selectedType === item.value && styles.typeRowSelected,
                ]}
                onPress={() => setSelectedType(item.value)}
                activeOpacity={0.7}
              >
                <View style={styles.typeRowLeft}>
                  <View
                    style={[
                      styles.typeIconWrap,
                      selectedType === item.value && styles.typeIconWrapSelected,
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={selectedType === item.value ? '#ffffff' : '#10464d'}
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.typeLabel,
                        selectedType === item.value && styles.typeLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.typeDescription}>{item.description}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedType === item.value && styles.radioSelected,
                  ]}
                >
                  {selectedType === item.value && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Descripción</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe el problema o la mejora con el mayor detalle posible..."
              placeholderTextColor="#a09890"
              multiline
              numberOfLines={6}
              maxLength={MAX_DESCRIPTION}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {description.length}/{MAX_DESCRIPTION}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Enviar feedback</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FeedbackScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDED',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 64,
  },
  heroWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  heroCard: {
    marginTop: 20,
    backgroundColor: '#10464d',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#0c353b',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  heroEyebrow: {
    color: '#9bd6ce',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#dbf2ee',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dacfbf',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#6a6156',
    marginTop: 4,
    marginBottom: 6,
  },
  typeRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  typeRowSelected: {
    backgroundColor: '#f0faf9',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd4c8',
  },
  typeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ebf5f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIconWrapSelected: {
    backgroundColor: '#10464d',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2f2f',
  },
  typeLabelSelected: {
    color: '#10464d',
  },
  typeDescription: {
    fontSize: 13,
    color: '#615d58',
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#c0b8af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#10464d',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10464d',
  },
  textArea: {
    minHeight: 130,
    fontSize: 15,
    color: '#2f2f2f',
    paddingTop: 8,
    paddingBottom: 8,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: '#a09890',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#10464d',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ebf5f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10464d',
    marginBottom: 12,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#615d58',
    textAlign: 'center',
    marginBottom: 32,
  },
});
