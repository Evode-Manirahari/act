import { useState, useCallback } from 'react';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VOICE_KEY = 'actober_voice_enabled';

export function useVoice() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const loadVoicePreference = useCallback(async () => {
    const stored = await AsyncStorage.getItem(VOICE_KEY);
    setVoiceEnabled(stored === 'true');
  }, []);

  const toggleVoice = useCallback(async () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    await AsyncStorage.setItem(VOICE_KEY, String(next));
    if (!next) Speech.stop();
  }, [voiceEnabled]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled) return;
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(text, {
      rate: 0.92,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [voiceEnabled]);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return { voiceEnabled, toggleVoice, loadVoicePreference, speak, stop, isSpeaking };
}
