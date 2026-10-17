import { Platform } from 'react-native';
import { Deadline, DeadlineType } from './types';

// Loaded safely: in Expo Go the native module is missing, so this stays null
// and reminders are simply switched off. In a development build it works.
let N: any = null;
try {
  N = require('expo-notifications');
} catch {
  N = null;
}

const CHANNEL_ID = 'deadlines';

export function remindersAvailable(): boolean {
  return N !== null;
}

// Show reminders even while the app is open
try {
  N?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // ignore
}

interface Slot {
  key: string;
  daysBefore: number;
  hour: number;
  when: string; // used in the notification title
}

function slotsFor(type: DeadlineType): Slot[] {
  const slots: Slot[] = [
    { key: 'd1', daysBefore: 1, hour: 20, when: 'tomorrow' },
    { key: 'd0', daysBefore: 0, hour: 8, when: 'today' },
  ];
  if (type === 'exam') {
    slots.unshift({ key: 'd3', daysBefore: 3, hour: 20, when: 'in 3 days' });
  }
  return slots;
}

const ALL_KEYS = ['d3', 'd1', 'd0'];

function timeFor(dueAt: string, daysBefore: number, hour: number): Date {
  const d = new Date(dueAt);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Creates the Android channel and asks for permission. Returns true if allowed.
export async function setupNotifications(): Promise<boolean> {
  if (!N) return false;
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Deadline reminders',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await N.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

export async function cancelForDeadline(id: string): Promise<void> {
  if (!N) return;
  for (const key of ALL_KEYS) {
    try {
      await N.cancelScheduledNotificationAsync(`${id}:${key}`);
    } catch {
      // nothing scheduled under that id, fine
    }
  }
}

// Safe to call many times: it cancels the old reminders first
export async function scheduleForDeadline(d: Deadline): Promise<void> {
  if (!N) return;
  await cancelForDeadline(d.id);
  if (d.done) return;

  const now = Date.now();
  for (const slot of slotsFor(d.type)) {
    const when = timeFor(d.dueAt, slot.daysBefore, slot.hour);
    if (when.getTime() <= now + 5000) continue; // already passed
    try {
      await N.scheduleNotificationAsync({
        identifier: `${d.id}:${slot.key}`,
        content: {
          title: `${d.course} ${d.type} is ${slot.when}`,
          body: d.title || 'Open Crampo to check your progress',
          sound: 'default',
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
    } catch {
      // ignore for now, we will handle errors later
    }
  }
}

// Fires in 5 seconds so you can check notifications work on your phone
export async function sendTestNotification(): Promise<void> {
  if (!N) return;
  await N.scheduleNotificationAsync({
    content: {
      title: 'Crampo test',
      body: 'Reminders are working. Beat the deadline rush.',
      sound: 'default',
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}

export async function countScheduled(): Promise<number> {
  if (!N) return 0;
  const all = await N.getAllScheduledNotificationsAsync();
  return all.length;
}