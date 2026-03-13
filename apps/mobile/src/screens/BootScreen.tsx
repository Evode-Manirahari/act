import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Boot'>;
};

const BOOT_LINES = [
  'ACTOBER v1.0.0 INITIALIZING...',
  'LOADING TRADE KNOWLEDGE BASE...',
  'NEC 2023 CODE DATABASE: READY',
  'ACT COACHING ENGINE: ACTIVE',
  'VISION MODULE: STANDBY',
];

export default function BootScreen({ navigation }: Props) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const opacities = useRef(BOOT_LINES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LINES.forEach((_, i) => {
      const timer = setTimeout(() => {
        Animated.timing(opacities[i], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        setVisibleLines((v) => v + 1);
      }, i * 400);
      timers.push(timer);
    });

    const navTimer = setTimeout(async () => {
      navigation.replace('Main');
    }, BOOT_LINES.length * 400 + 600);
    timers.push(navTimer);

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {BOOT_LINES.map((line, i) => (
          <Animated.Text key={i} style={[styles.line, { opacity: opacities[i] }]}>
            {line}
          </Animated.Text>
        ))}
        {visibleLines > 0 && (
          <View style={styles.cursor} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    gap: 8,
  },
  line: {
    fontFamily: 'Courier New',
    color: Colors.primary,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  cursor: {
    width: 10,
    height: 16,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
});
