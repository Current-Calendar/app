import React from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, SafeAreaView } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import profileStyles from '../../../styles/profile-styles';

export default function ProfileIndexScreen() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={[profileStyles.container, profileStyles.centerContent]}>
        <ActivityIndicator size="large" color="#164E52" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user?.username) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={`/profile/${encodeURIComponent(user.username)}` as any} />;
}