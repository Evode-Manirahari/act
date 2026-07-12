import React, { useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CaptureJobScreen from '../screens/CaptureJobScreen';
import DebriefScreen from '../screens/DebriefScreen';
import LearnScreen from '../screens/LearnScreen';
import LoginScreen from '../screens/LoginScreen';
import PilotHomeScreen from '../screens/PilotHomeScreen';
import PilotOutcomeScreen from '../screens/PilotOutcomeScreen';
import PilotReviewScreen from '../screens/PilotReviewScreen';
import type { KnowledgeObject } from '../api/libraryApi';
import { useAuthSession } from '../hooks/useAuthSession';
import { requireAuth, supabaseConfigStatus } from '../lib/supabase';
import { resolveAuthGate } from './authGateModel';
import { ActText, colors, spacing } from '../design';

export type PilotStackParamList = {
  PilotHome: { openAsk?: boolean } | undefined;
  CaptureJob: undefined;
  PilotReview: { recordingId?: string; queue?: boolean } | undefined;
  Learn: { card?: KnowledgeObject; cardId?: string } | undefined;
  PilotOutcome: { jobId?: string; recordedBy?: string; sourceRecordingId?: string } | undefined;
  Debrief: undefined;
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
      <Stack.Screen name="Debrief" component={DebriefScreen} />
    </Stack.Navigator>
  );
}

/**
 * Auth gate. Until a real Supabase project is configured (see
 * lib/supabase.ts), this renders the pilot stack exactly as it always has —
 * the existing demo-session flow is untouched. Once Supabase is configured,
 * an unauthenticated session shows LoginScreen instead; there is no public
 * sign-up, only invite-only accounts. Partial/invalid config, or a build
 * that sets EXPO_PUBLIC_REQUIRE_AUTH without Supabase vars, fails closed
 * (see authGateModel.ts). A session lost mid-run overlays the login on the
 * still-mounted stack so an in-progress capture is never destroyed.
 */
export default function PilotNavigator() {
  const { session, loading } = useAuthSession();

  const hadSessionRef = useRef(false);
  if (session) hadSessionRef.current = true;

  const gate = resolveAuthGate({
    configStatus: supabaseConfigStatus,
    requireAuth,
    loading,
    hasSession: Boolean(session),
    hadSession: hadSessionRef.current,
  });

  switch (gate) {
    case 'stack':
      return <PilotStack />;
    case 'login':
      return <LoginScreen />;
    case 'login-overlay':
      return (
        <View style={styles.flex}>
          <PilotStack />
          <View style={StyleSheet.absoluteFill}>
            <LoginScreen />
          </View>
        </View>
      );
    case 'loading':
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    case 'config-error':
      return (
        <View style={styles.configError}>
          <ActText variant="label" color="primary">
            AUTH CONFIG ERROR
          </ActText>
          <ActText variant="body" color="textMuted" style={styles.configErrorBody}>
            This build requires login but the Supabase configuration is missing or invalid.
            Rebuild with both EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY set.
          </ActText>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  configError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  configErrorBody: { textAlign: 'center', maxWidth: 320 },
});
