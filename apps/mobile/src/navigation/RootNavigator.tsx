import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import BootScreen from '../screens/BootScreen';
import MainTabs from './MainTabs';
import SessionDetailScreen from '../screens/SessionDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Boot" component={BootScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
