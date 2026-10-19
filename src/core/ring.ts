import { TEST_ALARM_ID, testAlarm } from './defaults';
import { MINUTE, previousOccurrence } from './time';
import type { ActiveRing, Alarm, AppData, PendingEvent } from './types';

/** A notification can land a moment before its time; treat that as on time. */
export const EARLY_TOLERANCE = 2_000;

export function defaultAlarmFor(data: AppData, alarmId: string): Alarm | undefined {
  if (alarmId === TEST_ALARM_ID) return testAlarm();
  return data.alarms.find((a) => a.id === alarmId);
}

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * What should be on screen right now: an alarm that's ringing and hasn't been
 * stopped or snoozed yet, or the "Are you awake?" question.
 */
export function findActive(data: AppData, now: number): ActiveRing | null {
  const soon = now + EARLY_TOLERANCE;
  let best: Extract<ActiveRing, { type: 'ring' }> | null = null;
  const consider = (ring: Extract<ActiveRing, { type: 'ring' }>) => {
    if (!best || ring.at > best.at) best = ring;
  };

  for (const alarm of data.alarms) {
    const at = previousOccurrence(alarm, soon);
    if (at === null || now >= at + alarm.ringMinutes * MINUTE) continue;
    if ((data.handled[alarm.id] ?? 0) >= at) continue;
    consider({ type: 'ring', source: 'alarm', alarmId: alarm.id, at, snoozesUsed: 0 });
  }

  for (const event of data.pending) {
    if (event.kind === 'awakeCheck' || event.at > soon) continue;
    const alarm = defaultAlarmFor(data, event.alarmId);
    if (!alarm || now >= event.at + alarm.ringMinutes * MINUTE) continue;
    consider({ type: 'ring', source: event.kind, alarmId: event.alarmId, at: event.at, eventId: event.id, snoozesUsed: event.snoozesUsed });
  }
  if (best) return best;

  for (const event of data.pending) {
    if (event.kind !== 'awakeCheck' || event.at > soon) continue;
    const alarm = defaultAlarmFor(data, event.alarmId);
    if (alarm && now < event.at + alarm.awakeCheck.answerMinutes * MINUTE) {
      return { type: 'check', alarmId: event.alarmId, eventId: event.id };
    }
  }
  return null;
}

export function canSnooze(alarm: Alarm, ring: Extract<ActiveRing, { type: 'ring' }>): boolean {
  return alarm.snooze.enabled && ring.source !== 'recheck' && ring.snoozesUsed < alarm.snooze.limit;
}

/** Marks a ring as dealt with: its occurrence is handled and its event is gone. */
function settle(data: AppData, ring: Extract<ActiveRing, { type: 'ring' }>): AppData {
  const handled = ring.source === 'alarm' ? { ...data.handled, [ring.alarmId]: ring.at } : data.handled;
  // Any earlier snooze or re-ring for the same alarm is over too.
  const pending = data.pending.filter((e) => !(e.alarmId === ring.alarmId && e.kind !== 'awakeCheck'));
  // A one-time alarm has done its job once it rang.
  const alarms = data.alarms.map((a) => (a.id === ring.alarmId && a.days.length === 0 && a.enabled ? { ...a, enabled: false, date: undefined } : a));
  return { ...data, alarms, pending, handled };
}

export function stop(data: AppData, ring: Extract<ActiveRing, { type: 'ring' }>, now: number): AppData {
  const alarm = defaultAlarmFor(data, ring.alarmId);
  let next = settle(data, ring);
  if (ring.source === 'recheck') {
    next = { ...next, pending: next.pending.filter((e) => e.alarmId !== ring.alarmId) };
  } else if (alarm?.awakeCheck.enabled && ring.source !== 'test') {
    const checkAt = now + alarm.awakeCheck.delayMinutes * MINUTE;
    const events: PendingEvent[] = [
      { id: makeId(), kind: 'awakeCheck', alarmId: alarm.id, at: checkAt, snoozesUsed: 0 },
      { id: makeId(), kind: 'recheck', alarmId: alarm.id, at: checkAt + alarm.awakeCheck.answerMinutes * MINUTE, snoozesUsed: 0 },
    ];
    next = { ...next, pending: [...next.pending.filter((e) => e.alarmId !== alarm.id), ...events] };
  }
  return next;
}

export function snooze(data: AppData, ring: Extract<ActiveRing, { type: 'ring' }>, now: number): AppData {
  const alarm = defaultAlarmFor(data, ring.alarmId);
  if (!alarm || !canSnooze(alarm, ring)) return data;
  const next = settle(data, ring);
  const event: PendingEvent = { id: makeId(), kind: 'snooze', alarmId: alarm.id, at: now + alarm.snooze.minutes * MINUTE, snoozesUsed: ring.snoozesUsed + 1 };
  return { ...next, pending: [...next.pending, event] };
}

/** "I'm awake": cancels the question and the re-ring that would follow it. */
export function confirmAwake(data: AppData, alarmId: string): AppData {
  return { ...data, pending: data.pending.filter((e) => !(e.alarmId === alarmId && (e.kind === 'awakeCheck' || e.kind === 'recheck'))) };
}

export function scheduleTest(data: AppData, now: number, inSeconds = 60): AppData {
  const event: PendingEvent = { id: makeId(), kind: 'test', alarmId: TEST_ALARM_ID, at: now + inSeconds * 1000, snoozesUsed: 0 };
  return { ...data, pending: [...data.pending.filter((e) => e.kind !== 'test'), event] };
}

/**
 * Drops events whose time has fully passed and turns off one-time alarms that
 * rang out unanswered. Returns the same object when nothing changed.
 */
export function cleanup(data: AppData, now: number): AppData {
  const pending = data.pending.filter((e) => {
    const alarm = defaultAlarmFor(data, e.alarmId);
    if (!alarm) return false;
    const window = e.kind === 'awakeCheck' ? alarm.awakeCheck.answerMinutes : alarm.ringMinutes;
    return now < e.at + window * MINUTE;
  });
  let alarmsChanged = false;
  const alarms = data.alarms.map((a) => {
    if (a.enabled && a.days.length === 0 && (a.date === undefined || now >= a.date + a.ringMinutes * MINUTE)) {
      alarmsChanged = true;
      return { ...a, enabled: false, date: undefined };
    }
    return a;
  });
  if (!alarmsChanged && pending.length === data.pending.length) return data;
  return { ...data, alarms, pending };
}
