// ACT notification content engine.
// Messages sound like ACT — direct, trade-calibrated, no fluff.

export interface NotificationContext {
  streak: number;
  domain?: string | null;
  lastProjectTitle?: string | null;
  notifyHour: number; // used to pick time-of-day variants
}

interface NotificationContent {
  title: string;
  body: string;
}

// ─── Message banks ────────────────────────────────────────────────────────────

const MORNING: NotificationContent[] = [
  { title: 'ACT', body: "What are you working on today?" },
  { title: 'ACT', body: "Morning. Got a job to knock out?" },
  { title: 'ACT', body: "New day. What needs fixing?" },
  { title: 'ACT', body: "Early start. Good time to get something done." },
  { title: 'ACT', body: "Morning. Tell ACT what you're working on." },
];

const AFTERNOON: NotificationContent[] = [
  { title: 'ACT', body: "Good time to get a job done." },
  { title: 'ACT', body: "Got an hour? ACT can help you use it well." },
  { title: 'ACT', body: "Something needs fixing? Now's the time." },
  { title: 'ACT', body: "Afternoon. Don't let the day slip by." },
  { title: 'ACT', body: "What's the job today?" },
];

const EVENING: NotificationContent[] = [
  { title: 'ACT', body: "Evening job? ACT's got you covered." },
  { title: 'ACT', body: "Still some time left. What are we fixing?" },
  { title: 'ACT', body: "One job before the day ends." },
  { title: 'ACT', body: "Evening. Quick fix before you wind down?" },
];

const STREAK: Record<number, string> = {
  2:  "2 days in a row. Keep it up.",
  3:  "3-day streak 🔥 Don't break it now.",
  5:  "5 days straight. You're on a roll.",
  7:  "One full week. That's discipline.",
  10: "10-day streak. Seriously impressive.",
  14: "Two weeks straight. You're building real habits.",
  21: "21 days. This is who you are now.",
  30: "30 days. That's not a streak — that's a habit.",
};

const DOMAIN: Record<string, string[]> = {
  PLUMBING:   [
    "Dripping faucet? Slow drain? ACT knows the fix.",
    "Got a plumbing issue? Tell ACT what you're seeing.",
    "Leaking pipe? Let's stop the water damage before it gets worse.",
  ],
  ELECTRICAL: [
    "Outlet not working? Fixture to swap? ACT talks you through it safely.",
    "Electrical issue? Describe what you're seeing. ACT will guide you.",
    "Don't guess with electrical. Tell ACT the problem first.",
  ],
  CARPENTRY:  [
    "Something to build or fix? Let's get to work.",
    "Door sticking? Shelf to hang? ACT's your second set of hands.",
    "Good day to make something. Tell ACT what the job is.",
  ],
  PAINTING:   [
    "Ready to transform a space? ACT's got the prep tips.",
    "Painting job? ACT starts with prep — the part most people skip.",
    "Good light today. Good day to paint. Tell ACT what the job is.",
  ],
  TILING:     [
    "Cracked tile? Ready to lay a new floor? Let's go.",
    "Tiling job? ACT knows the substrate, the spacing, the grout.",
    "Tile work today? Tell ACT what you're working on.",
  ],
  GENERAL:    [
    "Something around the house needs fixing. Tell ACT what it is.",
    "What's on the to-do list today?",
    "ACT is ready. What are we tackling?",
  ],
};

// ─── Content selector ─────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildNotificationContent(ctx: NotificationContext): NotificationContent {
  // Streak milestones take highest priority
  const streakMsg = STREAK[ctx.streak];
  if (streakMsg) {
    return { title: 'ACT', body: streakMsg };
  }

  // After a recent project
  if (ctx.lastProjectTitle) {
    return {
      title: 'ACT',
      body: `You finished "${ctx.lastProjectTitle}". What's next?`,
    };
  }

  // Domain-specific (every other notification roughly)
  if (ctx.domain && DOMAIN[ctx.domain] && Math.random() > 0.4) {
    return { title: 'ACT', body: pick(DOMAIN[ctx.domain]) };
  }

  // Active streak (not a milestone)
  if (ctx.streak > 0) {
    return {
      title: 'ACT',
      body: `${ctx.streak}-day streak 🔥 Keep going.`,
    };
  }

  // Time of day
  if (ctx.notifyHour < 12) return pick(MORNING);
  if (ctx.notifyHour < 17) return pick(AFTERNOON);
  return pick(EVENING);
}
