import type { AgeGroup, Alarm, AppData, Settings } from './types';
import { EMPTY_XP } from './xp';

export const TEST_ALARM_ID = 'test';

export function newAlarm(id: string): Alarm {
  return {
    id,
    hour: 7,
    minute: 0,
    days: [1, 2, 3, 4, 5],
    label: '',
    enabled: true,
    mode: 'gentle',
    sound: 'gentle',
    fadeInSeconds: 60,
    escalate: true,
    escalateAfterMinutes: 2,
    vibrate: true,
    vibration: 'basic',
    volume: 1,
    ringMinutes: 10,
    // Up to ~30 min of snoozing didn't harm sleep or mood (Sundelin et al., 2023).
    snooze: { enabled: true, minutes: 9, limit: 3 },
    awakeCheck: { enabled: false, delayMinutes: 5, answerMinutes: 3 },
    missions: [],
  };
}

/** The alarm a test ring uses: the deep tone, so you hear the loudest case. */
export function testAlarm(): Alarm {
  return { ...newAlarm(TEST_ALARM_ID), label: 'Test alarm', days: [], mode: 'deep', sound: 'deep', ringMinutes: 2, snooze: { enabled: false, minutes: 9, limit: 0 } };
}

export function defaultSettings(use24h: boolean, tempUnit: Settings['tempUnit'] = 'C'): Settings {
  // Adults need at least 7 hours (AASM/SRS consensus, 2015); 8 leaves room to fall asleep.
  return {
    sleepGoalMinutes: 8 * 60,
    bedtimeReminder: false,
    // Caffeine 6 hours before bed still costs sleep (Drake et al., 2013); 8 leaves a margin.
    caffeineReminder: false,
    caffeineHours: 8,
    sleepSound: { id: 'rain', minutes: 30, volume: 0.6 },
    reminderLeadMinutes: 30,
    use24h,
    tempUnit,
    profile: { name: '', ageGroup: null },
    missionIdleSeconds: 15,
    missionTimeLimitSeconds: 0,
    quietDuringMissions: true,
    brightScreen: true,
    morningLight: true,
    smartwatch: false,
    watchConsent: false,
    watchName: null,
    sampleSleep: true,
    goals: [],
    goalOther: '',
    onboarded: false,
  };
}

/**
 * Recommended sleep by age (National Sleep Foundation, Hirshkowitz et al.,
 * 2015), with the middle of the range as the suggested goal.
 */
export const AGE_GROUPS: Record<AgeGroup, { title: string; range: [number, number]; goal: number }> = {
  teen: { title: '14–17', range: [8, 10], goal: 9 * 60 },
  young: { title: '18–25', range: [7, 9], goal: 8 * 60 },
  adult: { title: '26–64', range: [7, 9], goal: 8 * 60 },
  older: { title: '65+', range: [7, 8], goal: 7.5 * 60 },
}

export function emptyData(use24h: boolean, tempUnit: Settings['tempUnit'] = 'C'): AppData {
  return { alarms: [], sleep: [], sleepingSince: null, settings: defaultSettings(use24h, tempUnit), pending: [], handled: {}, xp: EMPTY_XP, proUntil: null, trialStartedAt: null, trialEndSeen: false, offer: null };
}

/** A power-nap countdown: one ring at exactly `now + minutes`, no missions, no snooze. */
export function quickAlarm(id: string, now: number, minutes: number, sound: Alarm['sound'], mode: Alarm['mode'], vibrate: boolean): Alarm {
  const at = now + minutes * 60_000;
  const d = new Date(at);
  return {
    ...newAlarm(id),
    hour: d.getHours(),
    minute: d.getMinutes(),
    days: [],
    date: at,
    label: `Nap · ${minutes} min`,
    mode,
    sound,
    vibrate,
    fadeInSeconds: 30,
    escalate: true,
    escalateAfterMinutes: 1,
    ringMinutes: 10,
    snooze: { enabled: false, minutes: 9, limit: 0 },
    awakeCheck: { enabled: false, delayMinutes: 5, answerMinutes: 3 },
    missions: [],
    quick: true,
  };
}
