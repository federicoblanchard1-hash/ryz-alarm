import * as Notifications from 'expo-notifications';
import { AndroidAudioContentType, AndroidAudioUsage, AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedNotification, PlannedTrigger } from '@/core/plan';
import type { SoundId } from '@/core/types';

/** Scheduling only exists on phones; the web build is a preview. */
export const canSchedule = Platform.OS === 'ios' || Platform.OS === 'android';

const SOUND_FILE: Record<SoundId, string> = {
  gentle: 'gentle_melody.wav',
  deep: 'deep_520hz.wav',
  chime: 'chime.wav',
};

// Android fixes a channel's sound and vibration when it's created, so each
// combination gets its own channel. Bump the version to change one.
function channelId(sound: SoundId, vibrate: boolean): string {
  return `ryz-${sound}${vibrate || sound === 'chime' ? '' : '-novibe'}-v1`;
}

const RINGING_KINDS = new Set(['alarm', 'followup', 'snooze', 'recheck', 'test', 'awakeCheck']);

export async function setupNotifications(): Promise<void> {
  if (!canSchedule) return;

  Notifications.setNotificationHandler({
    // While Ryz is open it rings itself, so alarms stay silent here.
    handleNotification: async (notification) => {
      const ringing = RINGING_KINDS.has(String(notification.request.content.data?.kind));
      return { shouldShowBanner: !ringing, shouldShowList: !ringing, shouldPlaySound: !ringing, shouldSetBadge: false };
    },
  });

  if (Platform.OS !== 'android') return;
  const alarmChannel = (sound: SoundId, vibrate: boolean, name: string) =>
    Notifications.setNotificationChannelAsync(channelId(sound, vibrate), {
      name,
      importance: AndroidImportance.MAX,
      sound: SOUND_FILE[sound],
      // The alarm stream: rings at alarm volume, not the (often muted) notification volume.
      audioAttributes: { usage: AndroidAudioUsage.ALARM, contentType: AndroidAudioContentType.SONIFICATION },
      bypassDnd: true,
      enableVibrate: vibrate,
      vibrationPattern: vibrate ? [0, 800, 400, 800] : null,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
  await Promise.all([
    alarmChannel('gentle', true, 'Alarm · gentle'),
    alarmChannel('gentle', false, 'Alarm · gentle, no vibration'),
    alarmChannel('deep', true, 'Alarm · deep sleeper'),
    alarmChannel('deep', false, 'Alarm · deep sleeper, no vibration'),
    Notifications.setNotificationChannelAsync(channelId('chime', true), {
      name: 'Reminders',
      importance: AndroidImportance.HIGH,
      sound: SOUND_FILE.chime,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    }),
  ]);
}

export type PermissionState = { notifications: 'granted' | 'denied' | 'undetermined' };

export async function getPermissions(): Promise<PermissionState> {
  if (!canSchedule) return { notifications: 'denied' };
  const perm = await Notifications.getPermissionsAsync();
  return { notifications: perm.granted ? 'granted' : perm.canAskAgain ? 'undetermined' : 'denied' };
}

export async function requestPermissions(): Promise<boolean> {
  if (!canSchedule) return false;
  const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return res.granted;
}

// On Android, SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM (declared in app.json) make these fire on time.
function toTrigger(trigger: PlannedTrigger, channel: string): Notifications.NotificationTriggerInput {
  switch (trigger.type) {
    case 'date':
      return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger.date, channelId: channel };
    case 'daily':
      return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: trigger.hour, minute: trigger.minute, channelId: channel };
    case 'weekly':
      return { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: trigger.weekday, hour: trigger.hour, minute: trigger.minute, channelId: channel };
  }
}

async function apply(plan: PlannedNotification[], vibrateFor: (alarmId?: string) => boolean): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of plan) {
    const ringing = RINGING_KINDS.has(item.kind);
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: item.title,
        body: item.body,
        sound: SOUND_FILE[item.sound],
        data: { kind: item.kind, alarmId: item.alarmId },
        interruptionLevel: ringing ? 'timeSensitive' : 'active',
        priority: ringing ? Notifications.AndroidNotificationPriority.MAX : undefined,
      },
      trigger: toTrigger(item.trigger, channelId(item.sound, vibrateFor(item.alarmId))),
    });
  }
}

let queue: Promise<void> = Promise.resolve();

/** Replaces everything scheduled with `plan`. Calls run one after another. */
export function syncSchedule(plan: PlannedNotification[], vibrateFor: (alarmId?: string) => boolean): Promise<void> {
  if (!canSchedule) return Promise.resolve();
  queue = queue.then(() => apply(plan, vibrateFor)).catch((error) => console.warn('Ryz: could not schedule alarms', error));
  return queue;
}

/** Clears rung alarms from the notification shade. */
export function clearDelivered(): void {
  if (canSchedule) Notifications.dismissAllNotificationsAsync().catch(() => {});
}

/** Fires `callback` whenever a notification arrives in the foreground or is tapped. */
export function onNotificationActivity(callback: () => void): () => void {
  if (!canSchedule) return () => {};
  const received = Notifications.addNotificationReceivedListener(callback);
  const response = Notifications.addNotificationResponseReceivedListener(callback);
  return () => {
    received.remove();
    response.remove();
  };
}
