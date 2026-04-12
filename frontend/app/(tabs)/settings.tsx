import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const SettingsScreen = () => {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCoral} />

        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>

          <View style={styles.sectionCard}>
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
              style={[styles.row, styles.rowBorder]}
            //onPress={() => router.push('/change-password' as any)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="lock-closed-outline" size={22} color="#10464d" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Change password</Text>
                  <Text style={styles.rowSubtitle}>
                    Manage your account security
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#10464d" />
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="notifications-outline" size={22} color="#10464d" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Notifications</Text>
                  <Text style={styles.rowSubtitle}>
                    Receive reminders and updates
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#c9c4b8', true: '#e58a84' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
            //onPress={() => router.push('/privacy-settings' as any)}
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
              style={[styles.row, styles.rowBorder]}
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

            <TouchableOpacity
              style={styles.row}
            //onPress={() => router.push('/about' as any)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="information-circle-outline" size={22} color="#10464d" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>About</Text>
                  <Text style={styles.rowSubtitle}>
                    App version and additional information
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
    backgroundColor: '#e7e3d3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  headerGreen: {
    height: 74,
    backgroundColor: '#10464d',
  },
  headerCoral: {
    height: 34,
    backgroundColor: '#e58a84',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2f2f2f',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#e9e7e7',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#c9c4b8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 18,
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
    borderBottomColor: '#c9c4b8',
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
    fontWeight: '600',
    color: '#2f2f2f',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6e6e6e',
    marginTop: 2,
  },
  backButton: {
    alignSelf: 'center',
    width: '45%',
    backgroundColor: '#e7e3d3',
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