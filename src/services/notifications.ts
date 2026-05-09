import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { startOfDay, addDays, format, isFuture } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CalendarEventView } from '../types';

const HORIZON_DAYS = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(uid: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await updateDoc(doc(db, 'users', uid), { fcmToken: token });
  return token;
}

// ── Local scheduled notifications ────────────────────────────────────────────

export async function scheduleAllNotifications(
  events: CalendarEventView[],
  morningHour: number,
  morningMinute: number,
  preEventMinutes: number,
  language: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const isDE = language === 'de';

  // Daily morning summaries for the next HORIZON_DAYS days
  for (let d = 0; d < HORIZON_DAYS; d++) {
    const day = addDays(startOfDay(now), d);
    const notifTime = new Date(day);
    notifTime.setHours(morningHour, morningMinute, 0, 0);
    if (!isFuture(notifTime)) continue;

    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    const dayEvents = events
      .filter((e) => {
        if (e.isBlocker) return false;
        const s = e.startDate.toDate();
        return s >= dayStart && s < dayEnd;
      })
      .sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis());

    if (dayEvents.length === 0) continue;

    const count = dayEvents.length;
    const title = isDE
      ? `${count === 1 ? '1 Termin' : `${count} Termine`} heute`
      : `${count === 1 ? '1 event' : `${count} events`} today`;

    const body = dayEvents
      .slice(0, 5)
      .map((e) => {
        const time = e.allDay
          ? (isDE ? 'Ganztägig' : 'All day')
          : format(e.startDate.toDate(), 'HH:mm');
        return `${time} · ${e.title}`;
      })
      .join('\n');

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notifTime,
      },
    });
  }

  // Pre-event reminders for each upcoming event
  const horizon = addDays(now, HORIZON_DAYS);
  for (const event of events) {
    if (event.isBlocker || event.allDay) continue;
    const start = event.startDate.toDate();
    if (start > horizon) continue;
    const notifTime = new Date(start.getTime() - preEventMinutes * 60 * 1000);
    if (!isFuture(notifTime)) continue;

    const body = isDE
      ? `Beginnt in ${preEventMinutes} Min. (${format(start, 'HH:mm')})`
      : `Starts in ${preEventMinutes} min (${format(start, 'HH:mm')})`;

    await Notifications.scheduleNotificationAsync({
      content: { title: event.title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notifTime,
      },
    });
  }
}
