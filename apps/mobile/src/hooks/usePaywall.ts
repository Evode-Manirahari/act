import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECTS_KEY = 'actober_projects_this_month';
const PLUS_KEY = 'actober_is_plus';
const FREE_LIMIT = 3;

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}`;
}

export function usePaywall() {
  const [isPlus, setIsPlus] = useState(false);
  const [projectsThisMonth, setProjectsThisMonth] = useState(0);

  const load = useCallback(async () => {
    const plus = await AsyncStorage.getItem(PLUS_KEY);
    setIsPlus(plus === 'true');

    const stored = await AsyncStorage.getItem(`${PROJECTS_KEY}_${getMonthKey()}`);
    setProjectsThisMonth(parseInt(stored || '0', 10));
  }, []);

  const recordProject = useCallback(async () => {
    const key = `${PROJECTS_KEY}_${getMonthKey()}`;
    const stored = await AsyncStorage.getItem(key);
    const count = parseInt(stored || '0', 10) + 1;
    await AsyncStorage.setItem(key, String(count));
    setProjectsThisMonth(count);
  }, []);

  const activatePlus = useCallback(async () => {
    await AsyncStorage.setItem(PLUS_KEY, 'true');
    setIsPlus(true);
  }, []);

  const canStartProject = isPlus || projectsThisMonth < FREE_LIMIT;
  const remaining = isPlus ? Infinity : Math.max(0, FREE_LIMIT - projectsThisMonth);

  return { isPlus, canStartProject, remaining, load, recordProject, activatePlus };
}
