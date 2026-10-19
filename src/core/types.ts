import type { Mission } from './missions';

/** 0 = Sunday … 6 = Saturday, like `Date.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * gentle: a melody that fades in, for normal sleepers.
 * deep: the low 520 Hz T-3 tone from fire-safety research, for deep sleepers.
 */
export type WakeMode = 'gentle' | 'deep';

/** The sounds an alarm can ring with; see core/sounds.ts. */
export type AlarmSoundId = 'gentle' | 'deep' | 'air_raid' | 'yelp' | 'two_tone' | 'buzzer' | 'bell' | 'wind_chimes' | 'ocean' | 'birds' | 'sunrise' | 'music_box';

/** Every sound file, including the reminder chime. */
export type SoundId = AlarmSoundId | 'chime';

export interface Alarm {
  id: string;
  hour: number;
  minute: number;
  /** Empty means a one-time alarm. */
  days: Weekday[];
  /** For a one-time alarm: when it rings (ms). Set when it's enabled. */
  date?: number;
  label: string;
  enabled: boolean;
  mode: WakeMode;
  /** What it rings with. Its category sets `mode`: calm sounds fade in, loud ones need a hold to stop. */
  sound: AlarmSoundId;
  /** Gentle mode: seconds the melody takes to reach full volume. */
  fadeInSeconds: number;
  /** Gentle mode: switch to the deep tone if still ringing after `escalateAfterMinutes`. */
  escalate: boolean;
  escalateAfterMinutes: number;
  vibrate: boolean;
  /** 0.1–1: the loudest the alarm gets while Ryz plays it. Notifications use the phone's alarm volume. */
  volume: number;
  /** How long it keeps ringing if nobody touches it. */
  ringMinutes: number;
  snooze: { enabled: boolean; minutes: number; limit: number };
  /** After Stop, ask "Are you awake?" and ring again if there's no answer. */
  awakeCheck: { enabled: boolean; delayMinutes: number; answerMinutes: number };
  /** Tasks to finish before the alarm turns off, done in order. */
  missions: Mission[];
}

export interface Settings {
  sleepGoalMinutes: number;
  bedtimeReminder: boolean;
  /** Minutes before bedtime the reminder arrives. */
  reminderLeadMinutes: number;
  use24h: boolean;
  tempUnit: 'C' | 'F';
  /** News topic ids ("sport.football"). null until you've picked (or skipped) them. */
  newsTopics: string[] | null;
}

/**
 * Something that happens once at a fixed time and isn't part of an alarm's
 * schedule: a snooze, the awake check and its re-ring, or a test alarm.
 */
export interface PendingEvent {
  id: string;
  kind: 'snooze' | 'awakeCheck' | 'recheck' | 'test';
  alarmId: string;
  at: number;
  /** Snoozes already used for this wake-up. */
  snoozesUsed: number;
}

export interface AppData {
  alarms: Alarm[];
  settings: Settings;
  pending: PendingEvent[];
  /** Alarm id → the last occurrence (ms) that was stopped or snoozed. */
  handled: Record<string, number>;
}

/** What should be on screen right now, if anything. */
export type ActiveRing =
  | { type: 'ring'; source: 'alarm'; alarmId: string; at: number; snoozesUsed: 0 }
  | { type: 'ring'; source: 'snooze' | 'recheck' | 'test'; alarmId: string; at: number; eventId: string; snoozesUsed: number }
  | { type: 'check'; alarmId: string; eventId: string };
