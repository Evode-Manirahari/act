import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AskActScreen from '../screens/AskActScreen';
import CaptureJobScreen from '../screens/CaptureJobScreen';
import LearnScreen from '../screens/LearnScreen';
import PilotHomeScreen from '../screens/PilotHomeScreen';
import PilotReviewScreen from '../screens/PilotReviewScreen';

export type PilotStackParamList = {
  PilotHome: undefined;
  CaptureJob: undefined;
  PilotReview: { recordingId: string };
  Learn: undefined;
  AskAct: undefined;
};

const Stack = createNativeStackNavigator<PilotStackParamList>();

export default function PilotNavigator() {
  return (
    <Stack.Navigator initialRouteName="CaptureJob" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CaptureJob" component={CaptureJobScreen} />
      <Stack.Screen name="PilotReview" component={PilotReviewScreen} />
      <Stack.Screen name="PilotHome" component={PilotHomeScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="AskAct" component={AskActScreen} />
    </Stack.Navigator>
  );
}
