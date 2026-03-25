import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api } from '../api/act';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../navigation/RootNavigator';

const DEVICE_ID_KEY = 'actober_device_id';
const SESSION_ID_KEY = 'actober_active_session_id';

function generateDeviceId(): string {
  return 'device_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function BootScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setUser, setSession } = useActStore();
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    init();
  }, []);

  async function init() {
    // Ensure device ID
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    // Brief splash pause
    await new Promise(r => setTimeout(r, 900));

    try {
      const user = await api.registerUser(deviceId);
      setUser(user);

      // Try to resume the last active session
      const savedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      if (savedSessionId) {
        try {
          const session = await api.getSession(savedSessionId);
          if (session && session.phase !== 'COMPLETE') {
            setSession(session);
          } else {
            await AsyncStorage.removeItem(SESSION_ID_KEY);
          }
        } catch {
          await AsyncStorage.removeItem(SESSION_ID_KEY);
        }
      }

      // Route: first-time users go to Onboarding; returning users go to Main
      if (!user.name) {
        navigation.replace('Onboarding');
      } else {
        navigation.replace('Main');
      }
    } catch {
      navigation.replace('Main');
    }
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, alignItems: 'center' }}>
        <Text style={styles.logo}>ACTOBER</Text>
        <Text style={styles.tagline}>because free time should build something.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  logo: {
    fontSize: 36, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: 4, textAlign: 'center',
  },
  tagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)',
    marginTop: 12, textAlign: 'center', fontStyle: 'italic',
  },
});
