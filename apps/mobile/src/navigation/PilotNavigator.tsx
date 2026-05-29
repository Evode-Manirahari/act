import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AskActScreen from '../screens/AskActScreen';
import CaptureJobScreen from '../screens/CaptureJobScreen';
import LearnScreen from '../screens/LearnScreen';
import PilotHomeScreen from '../screens/PilotHomeScreen';
import PilotOutcomeScreen from '../screens/PilotOutcomeScreen';
import PilotReviewScreen from '../screens/PilotReviewScreen';
import type { KnowledgeObject } from '../api/libraryApi';

export type PilotStackParamList = {
  PilotHome: undefined;
  CaptureJob: undefined;
  PilotReview: { recordingId: string };
  Learn: { card?: KnowledgeObject; cardId?: string } | undefined;
  PilotOutcome: { jobId?: string; recordedBy?: string; sourceRecordingId?: string } | undefined;
  // Legacy photo-to-question-to-Claude diagnosis slice. Not the core Capture flow;
  // reachable from PilotHome behind a clearly-labeled legacy entry point.
  AskAct: undefined;
};

const Stack = createNativeStackNavigator<PilotStackParamList>();

export default function PilotNavigator() {
  return (
    <Stack.Navigator initialRouteName="PilotHome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PilotHome" component={PilotHomeScreen} />
      <Stack.Screen name="CaptureJob" component={CaptureJobScreen} />
      <Stack.Screen name="PilotReview" component={PilotReviewScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="PilotOutcome" component={PilotOutcomeScreen} />
      <Stack.Screen name="AskAct" component={AskActScreen} />
    </Stack.Navigator>
  );
}
