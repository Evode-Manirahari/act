import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CaptureJobScreen from '../screens/CaptureJobScreen';
import LearnScreen from '../screens/LearnScreen';
import LoginScreen from '../screens/LoginScreen';
import PilotHomeScreen from '../screens/PilotHomeScreen';
import PilotOutcomeScreen from '../screens/PilotOutcomeScreen';
import PilotReviewScreen from '../screens/PilotReviewScreen';
import type { KnowledgeObject } from '../api/libraryApi';
import { useAuthSession } from '../hooks/useAuthSession';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../design';

export type PilotStackParamList = {
  PilotHome: undefined;
  CaptureJob: undefined;
  PilotReview: { recordingId?: string; queue?: boolean } | undefined;
  Learn: { card?: KnowledgeObject; cardId?: string } | undefined;
  PilotOutcome: { jobId?: string; recordedBy?: string; sourceRecordingId?: string } | undefined;
};

const Stack = createNativeStackNavigator<PilotStackParamList>();

function PilotStack() {
  return (
    <Stack.Navigator initialRouteName="PilotHome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PilotHome" component={PilotHomeScreen} />
      <Stack.Screen name="CaptureJob" component={CaptureJobScreen} />
      <Stack.Screen name="PilotReview" component={PilotReviewScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="PilotOutcome" component={PilotOutcomeScreen} />
    </Stack.Navigator>
  );
}

/**
 * Auth gate. Until a real Supabase project is configured (see
 * lib/supabase.ts), `isSupabaseConfigured` is false and this renders the
 * pilot stack exactly as it always has — the existing demo-session flow is
 * untouched. Once Supabase is configured, an unauthenticated session shows
 * LoginScreen instead; there is no public sign-up, only invite-only accounts.
 */
export default function PilotNavigator() {
  const { session, loading } = useAuthSession();

  if (!isSupabaseConfigured) {
    return <PilotStack />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return session ? <PilotStack /> : <LoginScreen />;
}
