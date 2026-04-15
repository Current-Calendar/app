import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { requestPasswordReset } from '@/services/password-reset';
import profileStyles from '../../styles/profile-styles';

const COOKIE_PREFERENCE_KEY = 'current_cookie_preference';
const COOKIE_PREFERENCE_COOKIE = 'current_cookie_preference';
type CookiePreference = 'accepted' | 'rejected';

type CookiePreferenceStorage = {
  value: CookiePreference;
  acceptedAt: string;
  expiresAt: string;
};

function readCookiePreferenceFromCookie(): CookiePreference | null {
  if (Platform.OS !== 'web') return null;

  try {
    const pair = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${COOKIE_PREFERENCE_COOKIE}=`));
    if (!pair) return null;
    const rawValue = decodeURIComponent(pair.split('=').slice(1).join('='));
    return rawValue === 'accepted' || rawValue === 'rejected' ? rawValue : null;
  } catch {
    return null;
  }
}

const SettingsScreen = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [cookiePreference, setCookiePreference] = useState<CookiePreference | null>(null);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);

  const goToProfile = () => {
    router.push('/profile');
  };

  const readCookiePreference = React.useCallback(() => {
    if (Platform.OS !== 'web') return;

    try {
      const saved = window.localStorage.getItem(COOKIE_PREFERENCE_KEY);
      if (!saved) {
        setCookiePreference(readCookiePreferenceFromCookie());
        return;
      }

      // Backward compatibility with previous plain string format.
      if (saved === 'accepted' || saved === 'rejected') {
        setCookiePreference(saved);
        return;
      }

      const parsed = JSON.parse(saved) as CookiePreferenceStorage;
      const isValidValue = parsed?.value === 'accepted' || parsed?.value === 'rejected';
      const expiryMs = parsed?.expiresAt ? new Date(parsed.expiresAt).getTime() : NaN;
      const isExpired = Number.isNaN(expiryMs) || expiryMs <= Date.now();

      if (!isValidValue || isExpired) {
        setCookiePreference(readCookiePreferenceFromCookie());
        return;
      }

      setCookiePreference(parsed.value);
    } catch {
      setCookiePreference(null);
    }
  }, []);

  React.useEffect(() => {
    readCookiePreference();
    if (Platform.OS !== 'web') return;

    const onCookiePreferenceChanged = () => {
      readCookiePreference();
    };
    window.addEventListener('current:cookiePreferenceChanged', onCookiePreferenceChanged);

    return () => {
      window.removeEventListener('current:cookiePreferenceChanged', onCookiePreferenceChanged);
    };
  }, [readCookiePreference]);

  useFocusEffect(
    React.useCallback(() => {
      readCookiePreference();
    }, [readCookiePreference]),
  );

  const isLimitedMode = Platform.OS === 'web' && cookiePreference === 'rejected';

  const sendPasswordReset = async () => {
    const email = currentUser?.email?.trim();

    if (!email) {
      Alert.alert('Error', 'No email associated with your account.');
      return;
    }

    setIsSendingPasswordReset(true);

    try {
      const message = await requestPasswordReset(email);
      Alert.alert('Success', message);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not send recovery email. Please try again.',
      );
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={profileStyles.editHeaderGreen}>
            <View style={profileStyles.editHeaderRow}>
              <TouchableOpacity onPress={goToProfile}>
                <Text style={profileStyles.editHeaderButton}>Back</Text>
              </TouchableOpacity>
              <View style={{ width: 60 }} />
            </View>
          </View>
          <View style={profileStyles.editHeaderCoral} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrap}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Account center</Text>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.heroBody}>
              Manage your profile, privacy and experience in one place.
            </Text>
            {isLimitedMode && (
              <View style={styles.limitedPill}>
                <Ionicons name="shield-outline" size={14} color="#8a2f28" />
                <Text style={styles.limitedPillText}>Limited mode due to cookie rejection</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {isLimitedMode && (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Cookie rejection impacts</Text>
              <Text style={styles.warningBody}>
                You can keep using the app normally, but calendar recommendations, event recommendations,
                and non-essential notifications are turned off.
              </Text>
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Account</Text>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => router.push('/subscription' as any)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="card-outline" size={22} color="#10464d" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Subscription</Text>
                  <Text style={styles.rowSubtitle}>
                    Manage your plan and billing
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#10464d" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => router.push('/(tabs)/profile/profileEdit' as any)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="person-outline" size={22} color="#10464d" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Edit profile</Text>
                  <Text style={styles.rowSubtitle}>
                    Update your personal information
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#10464d" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, isSendingPasswordReset && styles.rowDisabled]}
              onPress={() => {
                void sendPasswordReset();
              }}
              disabled={isSendingPasswordReset}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="lock-closed-outline" size={22} color="#10464d" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Change password</Text>
                  <Text style={styles.rowSubtitle}>
                    Send a reset link to your account email
                  </Text>
                </View>
              </View>
              {isSendingPasswordReset ? (
                <ActivityIndicator size="small" color="#10464d" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#10464d" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Privacy and support</Text>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => router.push('/privacy-settings' as any)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#10464d" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Privacy</Text>
                  <Text style={styles.rowSubtitle}>
                    Control your visibility and account access
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#10464d" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/help-support' as any)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="help-circle-outline" size={22} color="#10464d" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Help & support</Text>
                  <Text style={styles.rowSubtitle}>
                    FAQs, contact and assistance
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#10464d" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

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
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 112,
    backgroundColor: '#df7f77',
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  limitedPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffe0dd',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f4b2ab',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  limitedPillText: {
    color: '#8a2f28',
    fontSize: 12,
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: '#fff0da',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f2c98d',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#825200',
    marginBottom: 4,
  },
  warningBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#624000',
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
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd4c8',
  },
  rowDisabled: {
    opacity: 0.7,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2f2f',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#615d58',
    marginTop: 2,
  },
  backButton: {
    alignSelf: 'center',
    width: '45%',
    backgroundColor: '#FFFDED',
    borderWidth: 1,
    borderColor: '#10464d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: '#10464d',
    fontSize: 16,
    fontWeight: '600',
  },
});
