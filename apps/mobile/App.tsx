import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { initSentry } from './src/lib/sentry';

initSentry();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#EA580C',
            background: '#0A0A0A',
            card: '#111111',
            text: '#FFFFFF',
            border: '#2A2A2A',
            notification: '#EA580C',
          },
        }}
      >
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
