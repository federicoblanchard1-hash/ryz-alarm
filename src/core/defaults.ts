import type { Alarm, AppData, Settings } from './types';

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
    fadeInSeconds: 60,
    escalate: true,
    escalateAfterMinutes: 2,
    vibrate: true,
    ringMinutes: 10,
    // Up to ~30 min of snoozing didn't harm sleep or mood (Sundelin et al., 2023).
    snooze: { enabled: true, minutes: 9, limit: 3 },
    awakeCheck: { enabled: false, delayMinutes: 5, answerMinutes: 3 },
  };
}

/** The alarm a test ring uses: the deep tone, so you hear the loudest case. */
export function testAlarm(): Alarm {
  return { ...newAlarm(TEST_ALARM_ID), label: 'Test alarm', days: [], mode: 'deep', ringMinutes: 2, snooze: { enabled: false, minutes: 9, limit: 0 } };
}

export function defaultSettings(use24h: boolean): Settings {
  // Adults need at least 7 hours (AASM/SRS consensus, 2015); 8 leaves room to fall asleep.
  return { sleepGoalMinutes: 8 * 60, bedtimeReminder: false, reminderLeadMinutes: 30, use24h };
}

export function emptyData(use24h: boolean): AppData {
  return { alarms: [], settings: defaultSettings(use24h), pending: [], handled: {} };
}
