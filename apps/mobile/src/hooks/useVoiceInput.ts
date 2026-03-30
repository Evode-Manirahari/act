import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Stops the recording, uploads to Whisper, returns transcript text or null
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (!uri) return null;

      setIsTranscribing(true);

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any);

      const res = await fetch(`${BASE_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) return null;
      const data = await res.json();
      return (data.text as string) || null;
    } catch {
      recordingRef.current = null;
      setIsRecording(false);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    recordingRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, isTranscribing, startRecording, stopRecording, cancelRecording };
}
