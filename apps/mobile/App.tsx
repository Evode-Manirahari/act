import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AskActScreen from './src/screens/AskActScreen';

// 2026-04-25: temporarily bypassing the multi-screen consumer-DIY flow to focus
// on the field-diagnostics slice. As of the 2026-05-19 wedge pivot the active
// trade is HVAC; the legacy electrical prompts remain selectable via the trade
// flag but HVAC is the default everywhere downstream. Old App.tsx (with
// NavigationContainer, notifications, RootNavigator) is preserved in git
// history at HEAD~. Restore with:
//   git show HEAD~:apps/mobile/App.tsx > apps/mobile/App.tsx
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AskActScreen />
    </SafeAreaProvider>
  );
}
