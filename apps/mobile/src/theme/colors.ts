export const colors = {
  primary: '#F97316',       // warm orange
  primaryLight: '#FED7AA',  // light orange tint
  background: '#FAFAF8',    // warm off-white
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',

  // Project category colors
  make: '#3B82F6',      // blue
  makeLight: '#DBEAFE',
  improve: '#8B5CF6',   // purple
  improveLight: '#EDE9FE',
  grow: '#10B981',      // green
  growLight: '#D1FAE5',
  create: '#F97316',    // orange
  createLight: '#FED7AA',

  // ACT chat bubbles
  actBubble: '#FFFFFF',
  actBubbleBorder: '#E5E7EB',
  userBubble: '#F97316',
  userBubbleText: '#FFFFFF',
} as const;

export type Colors = typeof colors;
