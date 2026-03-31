import { useState, useCallback, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { buildNotificationContent } from '../lib/notificationContent';

const PREFS_KEY = 'act_notification_prefs';

export interface NotificationPrefs {
  enabled: boolean;
  hour: number;   // 0–23
  minute: number; // always 0
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  hour: 10,
  minute: 0,
};

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function dailyTrigger(hour: number, minute: number): Notifications.NotificationTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  };
}

export function useNotifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadPrefs();
    checkPermission();
  }, []);

  async function loadPrefs() {
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) setPrefs(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }

  async function savePrefs(next: NotificationPrefs) {
    setPrefs(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }

  // ── Permission ──────────────────────────────────────────────────────────────
  async function checkPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(
      status === 'granted' ? 'granted' :
      status === 'denied'  ? 'denied'  : 'undetermined'
    );
    return status === 'granted';
  }

  async function requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F97316',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setPermissionStatus(granted ? 'granted' : 'denied');
    return granted;
  }

  // ── Scheduling ──────────────────────────────────────────────────────────────

  // Called on every app open — cancels the stale notification and reschedules
  // with fresh context-aware content.
  const reschedule = useCallback(async (ctx: {
    streak: number;
    domain?: string | null;
    lastProjectTitle?: string | null;
  }) => {
    if (!prefs.enabled || permissionStatus !== 'granted') return;

    await Notifications.cancelAllScheduledNotificationsAsync();
    const content = buildNotificationContent({ ...ctx, notifyHour: prefs.hour });

    await Notifications.scheduleNotificationAsync({
      content: { title: content.title, body: content.body, sound: true },
      trigger: dailyTrigger(prefs.hour, prefs.minute),
    });
  }, [prefs, permissionStatus]);

  // ── Enable / disable ────────────────────────────────────────────────────────
  async function enable(ctx: {
    streak: number;
    domain?: string | null;
    lastProjectTitle?: string | null;
  }): Promise<boolean> {
    const granted = permissionStatus === 'granted' || await requestPermission();
    if (!granted) return false;

    const next = { ...prefs, enabled: true };
    await savePrefs(next);

    const content = buildNotificationContent({ ...ctx, notifyHour: next.hour });
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: content.title, body: content.body, sound: true },
      trigger: dailyTrigger(next.hour, next.minute),
    });

    return true;
  }

  async function disable() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await savePrefs({ ...prefs, enabled: false });
  }

  async function setTime(hour: number, ctx: {
    streak: number;
    domain?: string | null;
    lastProjectTitle?: string | null;
  }) {
    const next = { ...prefs, hour };
    await savePrefs(next);

    if (prefs.enabled && permissionStatus === 'granted') {
      const content = buildNotificationContent({ ...ctx, notifyHour: hour });
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title: content.title, body: content.body, sound: true },
        trigger: dailyTrigger(hour, 0),
      });
    }
  }

  return {
    prefs,
    permissionStatus,
    loaded,
    enable,
    disable,
    setTime,
    reschedule,
    requestPermission,
  };
}
