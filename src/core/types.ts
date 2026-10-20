import type { Mission } from './missions';
import type { VibrationId } from './vibration';
import type { XpState } from './xp';

/** 0 = Sunday … 6 = Saturday, like `Date.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * gentle: a melody that fades in, for normal sleepers.
 * deep: the low 520 Hz T-3 tone from fire-safety research, for deep sleepers.
 */
export type WakeMode = 'gentle' | 'deep';

/** The sounds an alarm can ring with; see core/sounds.ts. */
export type AlarmSoundId =
  | 'gentle'
  | 'deep'
  | 'deep_400'
  | 'rising'
  | 'rhythmic'
  | 'air_raid'
  | 'yelp'
  | 'two_tone'
  | 'wail'
  | 'hi_lo'
  | 'red_alert'
  | 'klaxon'
  | 'foghorn'
  | 'car'
  | 'buzzer'
  | 'continuous'
  | 'pulse'
  | 'escalating'
  | 'smoke'
  | 'bell'
  | 'fire_bell'
  | 'phone'
  | 'reveille'
  | 'wind_chimes'
  | 'ocean'
  | 'birds'
  | 'rain'
  | 'stream'
  | 'forest'
  | 'sunrise'
  | 'music_box'
  | 'harp'
  | 'guitar'
  | 'kalimba'
  | 'piano'
  | 'singing_bowl'
  | 'lofi'
  | 'pink_noise'
  | 'brown_noise';

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
  /** The buzz rhythm while Ryz rings; see core/vibration.ts. */
  vibration: VibrationId;
  /** 0.1–1: the loudest the alarm gets while Ryz plays it. Notifications use the phone's alarm volume. */
  volume: number;
  /** How long it keeps ringing if nobody touches it. */
  ringMinutes: number;
  snooze: { enabled: boolean; minutes: number; limit: number };
  /** After Stop, ask "Are you awake?" and ring again if there's no answer. */
  awakeCheck: { enabled: boolean; delayMinutes: number; answerMinutes: number };
  /** Tasks to finish before the alarm turns off, done in order. */
  missions: Mission[];
  /** A countdown for a nap: rings once at `date`, no missions, and removes itself afterwards. */
  quick?: boolean;
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
  /** Kept on this phone only. */
  profile: { name: string; ageGroup: AgeGroup | null };
  /** Seconds without a tap, shake or step before a turned-down alarm goes back to full volume. */
  missionIdleSeconds: number;
  /** Seconds to finish each mission before it starts over with a new puzzle; 0 means no limit. */
  missionTimeLimitSeconds: number;
  /** Turn the alarm down while you work on a mission. */
  quietDuringMissions: boolean;
  /** Turn the screen up to full brightness while the alarm rings. */
  brightScreen: boolean;
  /** On the morning screen, a reminder to get daylight soon after waking. */
  morningLight: boolean;
  /** Sleep comes in automatically from a smartwatch (Apple Health / Health Connect) instead of the button. */
  smartwatch: boolean;
  /** What you want Ryz to help with, from sign-up. */
  goals: string[];
  /** Anything else you typed under "Other". */
  goalOther: string;
  /** Finished the welcome: account, news topics and goals. */
  onboarded: boolean;
}

export type AgeGroup = 'teen' | 'young' | 'adult' | 'older';

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

/** One night: when you went to sleep and when you got up (ms). */
export interface SleepRecord {
  id: string;
  start: number;
  end: number;
  /** How rested you felt, 1 (awful) to 5 (great). */
  rating?: 1 | 2 | 3 | 4 | 5;
  /** Where it came from: the Start sleep button (default), typed in, or a smartwatch via Apple Health / Health Connect. */
  source?: 'button' | 'manual' | 'watch';
}

export interface AppData {
  alarms: Alarm[];
  /** Logged nights, oldest first. */
  sleep: SleepRecord[];
  /** When the running sleep session started; null when awake. */
  sleepingSince: number | null;
  settings: Settings;
  pending: PendingEvent[];
  /** Alarm id → the last occurrence (ms) that was stopped or snoozed. */
  handled: Record<string, number>;
  /** Experience points, earned for good mornings and nights, spent on free Pro. */
  xp: XpState;
  /** Pro is on until then (ms); null if never. */
  proUntil: number | null;
}

/** What should be on screen right now, if anything. */
export type ActiveRing =
  | { type: 'ring'; source: 'alarm'; alarmId: string; at: number; snoozesUsed: 0 }
  | { type: 'ring'; source: 'snooze' | 'recheck' | 'test'; alarmId: string; at: number; eventId: string; snoozesUsed: number }
  | { type: 'check'; alarmId: string; eventId: string };
