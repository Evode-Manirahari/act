import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedMessage {
  id: string;
  sessionId: string;
  message: string;
  timestamp: number;
}

const QUEUE_KEY = 'actober:offline:queue';

export async function enqueueMessage(sessionId: string, message: string): Promise<void> {
  const existing = await loadQueue();
  const entry: QueuedMessage = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sessionId,
    message,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, entry]));
}

export async function loadQueue(): Promise<QueuedMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMessage[];
  } catch {
    return [];
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await loadQueue();
  const updated = queue.filter((q) => q.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

// Session-level local backup
export async function backupSessionMessages(
  sessionId: string,
  messages: Array<{ id: string; role: string; content: string; isSafetyAlert: boolean; createdAt: string }>
): Promise<void> {
  await AsyncStorage.setItem(
    `actober:session:${sessionId}:messages`,
    JSON.stringify(messages)
  );
}

export async function loadSessionBackup(
  sessionId: string
): Promise<Array<{ id: string; role: string; content: string; isSafetyAlert: boolean; createdAt: string }>> {
  try {
    const raw = await AsyncStorage.getItem(`actober:session:${sessionId}:messages`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
