// Minimal-functional motion. No bounce. Enter ease-out, exit ease-in, move
// ease-in-out. Durations in ms. Only the durations/easings the app actually
// animates with live here — an unused token is a decision nobody made.
import { Easing } from 'react-native';

export const durations = {
  short: 180,
  sheet: 320,
} as const;

export const easings = {
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
  move: Easing.inOut(Easing.cubic),
  sheet: Easing.bezier(0.2, 0.8, 0.2, 1),
} as const;
