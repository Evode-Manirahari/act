import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'actober_streak';
const LAST_BUILD_KEY = 'actober_last_build_date';
const TOTAL_KEY = 'actober_total_completed';

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface StreakData {
  streak: number;
  lastBuildDate: string | null;
  totalCompleted: number;
}

export function useStreak() {
  const [data, setData] = useState<StreakData>({ streak: 0, lastBuildDate: null, totalCompleted: 0 });

  const load = useCallback(async (): Promise<StreakData> => {
    const [streakRaw, lastBuild, totalRaw] = await Promise.all([
      AsyncStorage.getItem(STREAK_KEY),
      AsyncStorage.getItem(LAST_BUILD_KEY),
      AsyncStorage.getItem(TOTAL_KEY),
    ]);

    let streak = parseInt(streakRaw || '0', 10);
    const total = parseInt(totalRaw || '0', 10);

    // Break streak if last build wasn't today or yesterday
    if (lastBuild && lastBuild !== todayStr() && lastBuild !== yesterdayStr()) {
      streak = 0;
      await AsyncStorage.setItem(STREAK_KEY, '0');
    }

    const result: StreakData = { streak, lastBuildDate: lastBuild, totalCompleted: total };
    setData(result);
    return result;
  }, []);

  const recordCompletion = useCallback(async () => {
    const lastBuild = await AsyncStorage.getItem(LAST_BUILD_KEY);
    const today = todayStr();
    const yesterday = yesterdayStr();

    let streak = parseInt((await AsyncStorage.getItem(STREAK_KEY)) || '0', 10);
    const total = parseInt((await AsyncStorage.getItem(TOTAL_KEY)) || '0', 10) + 1;

    if (lastBuild === today) {
      // Already built today, no streak change
    } else if (lastBuild === yesterday) {
      streak += 1;
    } else {
      streak = 1; // restart streak
    }

    await Promise.all([
      AsyncStorage.setItem(STREAK_KEY, String(streak)),
      AsyncStorage.setItem(LAST_BUILD_KEY, today),
      AsyncStorage.setItem(TOTAL_KEY, String(total)),
    ]);

    setData({ streak, lastBuildDate: today, totalCompleted: total });
  }, []);

  return { ...data, load, recordCompletion };
}
