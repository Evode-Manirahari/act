import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  isOnline: boolean;
  isSyncing: boolean;
}

export default function OfflineBanner({ isOnline, isSyncing }: Props) {
  const slideAnim = useRef(new Animated.Value(-32)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: !isOnline || isSyncing ? 0 : -32,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isOnline, isSyncing]);

  if (isOnline && !isSyncing) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        {isSyncing ? 'SYNCING...' : 'OFFLINE MODE — ACT using cached knowledge'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#1A0E00',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  text: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});
