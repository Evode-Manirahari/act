// Minimal-functional motion. No bounce. Enter ease-out, exit ease-in, move
// ease-in-out. Durations in ms. Haptics map documents where expo-haptics fires.
import { Easing } from 'react-native';

export const durations = {
  micro: 80,
  short: 180,
  medium: 300,
  sheet: 320,
} as const;

export const easings = {
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
  move: Easing.inOut(Easing.cubic),
  sheet: Easing.bezier(0.2, 0.8, 0.2, 1), // the prototype's bottom-sheet feel
} as const;

// expo-haptics call sites (already a dependency):
//   recordingStarted -> notificationAsync(Success)
//   markSaved        -> impactAsync(Heavy)
//   stopCapture      -> impactAsync(Medium)
//   uploadComplete   -> impactAsync(Light)
export const haptics = {
  recordingStarted: 'notification/success',
  markSaved: 'impact/heavy',
  stopCapture: 'impact/medium',
  uploadComplete: 'impact/light',
} as const;
