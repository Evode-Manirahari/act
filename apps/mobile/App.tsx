import React, { useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

export const navigationRef = createNavigationContainerRef();

export default function App() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Foreground notification — show it as an in-app banner (handled by setNotificationHandler)
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Nothing extra needed — setNotificationHandler in useNotifications handles display
    });

    // Notification tap — bring user to Today tab
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) {
        // Navigate to Today tab which opens HomeScreen
        navigationRef.navigate('Main' as never);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        theme={{
          dark: false,
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.primary,
          },
        }}
      >
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
