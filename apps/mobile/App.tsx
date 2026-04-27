import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AskActScreen from './src/screens/AskActScreen';

// 2026-04-25: temporarily bypassing the multi-screen consumer-DIY flow to focus
// on the electrician field-diagnostics slice. Old App.tsx (with NavigationContainer,
// notifications, RootNavigator) is preserved in git history at HEAD~. Restore
// with: git show HEAD~:apps/mobile/App.tsx > apps/mobile/App.tsx
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AskActScreen />
    </SafeAreaProvider>
  );
}
