import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Image,
  ActivityIndicator,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/api-client';
import { API_CONFIG } from '@/constants/api';
import { useAuth } from '@/hooks/use-auth';

const mascotFree = require('../../assets/images/mascota-sorpresa.png');
const mascotStandard = require('../../assets/images/mascota-feliz-ojos-cerrados.png');
const mascotBusiness = require('../../assets/images/mascota-traje.png');

type PlanKey = 'FREE' | 'STANDARD' | 'BUSINESS';

const PLAN_INFO: Record<PlanKey, {
  label: string;
  price: string | null;
  annualPrice: string | null;
  mascot: ImageSourcePropType;
  color: string;
}> = {
  FREE: {
    label: 'Free Plan',
    price: null,
    annualPrice: null,
    mascot: mascotFree,
    color: '#10464d',
  },
  STANDARD: {
    label: 'Standard Pack',
    price: '4.99€ / month',
    annualPrice: '45.99€ / year',
    mascot: mascotStandard,
    color: '#10464d',
  },
  BUSINESS: {
    label: 'Business Pack',
    price: '9.99€ / month',
    annualPrice: '109.99€ / year',
    mascot: mascotBusiness,
    color: '#0b5d73',
  },
};

export default function PaymentScreen() {
  const { plan } = useLocalSearchParams<{ plan: PlanKey }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, setUser } = useAuth();

  const isMobile = width < 768;
  const planKey: PlanKey = (plan && plan in PLAN_INFO) ? plan as PlanKey : 'FREE';
  const info = PLAN_INFO[planKey];
  const isFree = planKey === 'FREE';

  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleConfirm = async () => {
    setErrorMsg(null);

    if (!isFree) {
      if (
        !cardName.trim() ||
        cardNumber.replace(/\s/g, '').length < 16 ||
        expiry.length < 5 ||
        cvv.length < 3
      ) {
        setErrorMsg('Please fill in all card details correctly.');
        return;
      }
    }

    setLoading(true);
    try {
      const updated = await apiClient.post<{ plan: string }>(
        API_CONFIG.endpoints.updatePlan,
        { plan: planKey },
      );
      // Reflect new plan in auth context without a full refetch
      if (user) setUser({ ...user, plan: updated.plan });
      setSuccess(true);
      setTimeout(() => router.replace('/subscription'), 1800);
    } catch (err) {
      console.error('Plan update error:', err);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const price = billing === 'annual' ? info.annualPrice : info.price;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, isMobile && styles.scrollMobile]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#10464d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>

        <View style={[styles.inner, !isMobile && styles.innerDesktop]}>
          {/* Plan summary card */}
          <View style={[styles.summaryCard, { borderColor: info.color }]}>
            <Image source={info.mascot} style={styles.mascot} resizeMode="contain" />
            <Text style={[styles.planLabel, { color: info.color }]}>{info.label}</Text>

            {!isFree && (
              <View style={styles.billingToggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, billing === 'monthly' && styles.toggleActive]}
                  onPress={() => setBilling('monthly')}
                >
                  <Text style={[styles.toggleText, billing === 'monthly' && styles.toggleTextActive]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, billing === 'annual' && styles.toggleActive]}
                  onPress={() => setBilling('annual')}
                >
                  <Text style={[styles.toggleText, billing === 'annual' && styles.toggleTextActive]}>
                    Annual
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {price ? (
              <Text style={styles.priceText}>{price}</Text>
            ) : (
              <Text style={styles.freeText}>Free — no credit card required</Text>
            )}
          </View>

          {/* Payment form — hidden for free plan */}
          {!isFree && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Payment details</Text>

              <Text style={styles.fieldLabel}>Card holder name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name on card"
                placeholderTextColor="#aaa"
                value={cardName}
                onChangeText={setCardName}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Card number</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#aaa"
                value={cardNumber}
                onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                keyboardType="numeric"
                maxLength={19}
              />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Expiry</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    placeholderTextColor="#aaa"
                    value={expiry}
                    onChangeText={(v) => setExpiry(formatExpiry(v))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor="#aaa"
                    value={cvv}
                    onChangeText={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.secureRow}>
                <Ionicons name="lock-closed" size={13} color="#888" />
                <Text style={styles.secureText}>Payments are encrypted and secure</Text>
              </View>
            </View>
          )}

          {/* Error message */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#b94040" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Success message */}
          {success && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#2d7a4f" />
              <Text style={styles.successText}>
                {isFree ? 'You are now on the Free Plan!' : `Subscribed to ${info.label}!`}
                {' '}Redirecting…
              </Text>
            </View>
          )}

          {/* Confirm button */}
          {!success && (
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: info.color }, loading && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.84}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>
                  {isFree ? 'Start Free' : `Pay ${price}`}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!isFree && !success && (
            <Text style={styles.termsText}>
              By confirming you agree to our Terms of Service and authorize the charge shown above.
              Cancel anytime from Settings.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDED',
  },
  scroll: {
    paddingBottom: 60,
  },
  scrollMobile: {
    paddingBottom: 100,
  },
  header: {
    height: 34,
    backgroundColor: '#e58a84',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  backBtn: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10464d',
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  innerDesktop: {
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 10,
  },
  mascot: {
    width: 110,
    height: 110,
  },
  planLabel: {
    fontSize: 22,
    fontWeight: '800',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#d4d0c2',
    borderRadius: 12,
    padding: 3,
    marginTop: 4,
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: '#10464d',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  toggleTextActive: {
    color: '#fff',
  },
  priceText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0b5d73',
  },
  freeText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#10464d',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 22,
    gap: 6,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10464d',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c0bdb0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  secureText: {
    fontSize: 12,
    color: '#888',
  },
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fdecea',
    borderWidth: 1,
    borderColor: '#e8b4b4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: '#b94040',
    fontSize: 14,
    fontWeight: '500',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eaf6ef',
    borderWidth: 1,
    borderColor: '#a8d5b5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  successText: {
    flex: 1,
    color: '#2d7a4f',
    fontSize: 14,
    fontWeight: '600',
  },
});
