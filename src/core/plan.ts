import { defaultAlarmFor } from './ring';
import { MINUTE, formatClockText, formatHours, nextOccurrence } from './time';
import { SOUNDS } from './sounds';
import type { Alarm, AppData, SoundId, WakeMode, Weekday } from './types';

export type PlannedTrigger =
  | { type: 'date'; date: number }
  | { type: 'daily'; hour: number; minute: number }
  /** weekday: 1 = Sunday … 7 = Saturday, as expo-notifications expects. */
  | { type: 'weekly'; weekday: number; hour: number; minute: number };

export type PlannedKind = 'alarm' | 'followup' | 'snooze' | 'recheck' | 'test' | 'awakeCheck' | 'bedtime';

export interface PlannedNotification {
  id: string;
  kind: PlannedKind;
  alarmId?: string;
  sound: SoundId;
  title: string;
  body: string;
  trigger: PlannedTrigger;
}

/** A notification sound plays once (iOS caps it at 30 s), so a ring is re-sent this often. */
export const FOLLOW_UP_SECONDS = 30;
/** iOS keeps at most 64 pending notifications; leave a little headroom. */
export const NOTIFICATION_LIMIT = 60;

const DAY_MINUTES = 24 * 60;

interface Ring {
  alarm: Alarm;
  start: number;
  kind: 'alarm' | 'snooze' | 'recheck' | 'test';
  key: string;
}

/** The sound a ring makes `seconds` after it started. */
/** Whether a ring is in its soft, fading phase or its loud one at `seconds` in. */
export function phaseAt(alarm: Alarm, kind: Ring['kind'], seconds: number): WakeMode {
  if (alarm.mode === 'deep' || kind === 'recheck') return 'deep';
  return alarm.escalate && seconds >= alarm.escalateAfterMinutes * 60 ? 'deep' : 'gentle';
}

/**
 * The sound playing at `seconds` in: the alarm's own sound in the phase it
 * belongs to, otherwise the melody (soft) or the 520 Hz tone (loud).
 */
export function soundAt(alarm: Alarm, kind: Ring['kind'], seconds: number): SoundId {
  const phase = phaseAt(alarm, kind, seconds);
  const own = SOUNDS[alarm.sound] ?? SOUNDS.gentle;
  if (own.mode === phase) return alarm.sound;
  return phase === 'deep' ? 'deep' : 'gentle';
}

function title(alarm: Alarm): string {
  return alarm.label.trim() || 'Alarm';
}

/**
 * Every notification Ryz should have scheduled right now. Alarms repeat on
 * weekly triggers, so they keep ringing even if the app isn't opened for
 * weeks; follow-ups (which keep a ring going) cover the soonest rings first,
 * within the iOS limit.
 */
export function buildPlan(data: AppData, now: number, limit = NOTIFICATION_LIMIT): PlannedNotification[] {
  const { settings } = data;
  const fixed: PlannedNotification[] = [];
  const rings: Ring[] = [];
  const enabled = data.alarms.filter((a) => a.enabled);

  for (const alarm of enabled) {
    const clock = formatClockText(alarm.hour, alarm.minute, settings.use24h);
    const base = { kind: 'alarm' as const, alarmId: alarm.id, sound: soundAt(alarm, 'alarm', 0), title: title(alarm), body: alarm.missions.length ? `${clock} · Tap to start your mission` : `${clock} · Tap to stop or snooze` };
    if (alarm.days.length > 0 && alarm.skip !== undefined && alarm.skip > now) {
      // Skipping one ring: the next two weeks as single rings, without it. Ryz goes back to
      // weekly triggers the next time it's opened after the skipped day.
      for (let t = nextOccurrence(alarm, now); t !== null && t < now + 14 * 24 * 60 * MINUTE; t = nextOccurrence(alarm, t)) {
        fixed.push({ ...base, id: `alarm:${alarm.id}:${t}`, trigger: { type: 'date', date: t } });
      }
    } else if (alarm.days.length === 0) {
      if (alarm.date === undefined || alarm.date <= now) continue;
      fixed.push({ ...base, id: `alarm:${alarm.id}`, trigger: { type: 'date', date: alarm.date } });
    } else if (alarm.days.length === 7) {
      fixed.push({ ...base, id: `alarm:${alarm.id}`, trigger: { type: 'daily', hour: alarm.hour, minute: alarm.minute } });
    } else {
      for (const day of [...alarm.days].sort()) {
        fixed.push({ ...base, id: `alarm:${alarm.id}:${day}`, trigger: { type: 'weekly', weekday: day + 1, hour: alarm.hour, minute: alarm.minute } });
      }
    }
    const next = nextOccurrence(alarm, now);
    if (next !== null) rings.push({ alarm, start: next, kind: 'alarm', key: `${alarm.id}:${next}` });
  }

  for (const event of data.pending) {
    if (event.at <= now) continue;
    const alarm = defaultAlarmFor(data, event.alarmId);
    if (!alarm) continue;
    if (event.kind === 'awakeCheck') {
      fixed.push({
        id: `event:${event.id}`, kind: 'awakeCheck', alarmId: alarm.id, sound: 'chime',
        title: 'Are you awake?',
        body: `Tap to confirm, or the alarm rings again in ${alarm.awakeCheck.answerMinutes} min.`,
        trigger: { type: 'date', date: event.at },
      });
      continue;
    }
    const body = event.kind === 'snooze' ? 'Snooze is over' : event.kind === 'recheck' ? "You didn't answer — time to get up" : 'This is what your alarm sounds like';
    fixed.push({ id: `event:${event.id}`, kind: event.kind, alarmId: alarm.id, sound: soundAt(alarm, event.kind, 0), title: title(alarm), body, trigger: { type: 'date', date: event.at } });
    rings.push({ alarm, start: event.at, kind: event.kind, key: `event:${event.id}` });
  }

  if (settings.bedtimeReminder) fixed.push(...bedtimeReminders(data, now));
  if (settings.caffeineReminder) fixed.push(...caffeineReminders(data));

  const plan = fixed.slice(0, limit);
  let budget = limit - plan.length;
  rings.sort((a, b) => a.start - b.start);
  for (const ring of rings) {
    const count = Math.floor((ring.alarm.ringMinutes * 60) / FOLLOW_UP_SECONDS) - 1;
    for (let i = 1; i <= count && budget > 0; i++, budget--) {
      const seconds = i * FOLLOW_UP_SECONDS;
      plan.push({
        id: `followup:${ring.key}:${i}`,
        kind: 'followup',
        alarmId: ring.alarm.id,
        sound: soundAt(ring.alarm, ring.kind, seconds),
        title: title(ring.alarm),
        body: ring.alarm.missions.length ? 'Still ringing — tap to finish your mission' : 'Still ringing — tap to open Ryz',
        trigger: { type: 'date', date: ring.start + seconds * 1000 },
      });
    }
  }
  return plan;
}

/** "Time to wind down" before the earliest alarm of each morning. */
function bedtimeReminders(data: AppData, now: number): PlannedNotification[] {
  const { settings } = data;
  const before = settings.sleepGoalMinutes + settings.reminderLeadMinutes;
  const earliest = new Map<Weekday, Alarm>();
  for (const alarm of data.alarms) {
    if (!alarm.enabled) continue;
    for (const day of alarm.days) {
      const current = earliest.get(day);
      if (!current || alarm.hour * 60 + alarm.minute < current.hour * 60 + current.minute) earliest.set(day, alarm);
    }
  }

  const body = (alarm: Alarm) => {
    const bed = (alarm.hour * 60 + alarm.minute - settings.sleepGoalMinutes + DAY_MINUTES * 2) % DAY_MINUTES;
    const bedText = formatClockText(Math.floor(bed / 60), bed % 60, settings.use24h);
    const alarmText = formatClockText(alarm.hour, alarm.minute, settings.use24h);
    return `Be in bed by ${bedText} for ${formatHours(settings.sleepGoalMinutes)} of sleep before your ${alarmText} alarm.`;
  };

  const out: PlannedNotification[] = [];
  for (const [day, alarm] of earliest) {
    let minuteOfDay = alarm.hour * 60 + alarm.minute - before;
    let weekday = day as number;
    while (minuteOfDay < 0) {
      minuteOfDay += DAY_MINUTES;
      weekday = (weekday + 6) % 7;
    }
    out.push({
      id: `bedtime:${day}`, kind: 'bedtime', alarmId: alarm.id, sound: 'chime', title: 'Time to wind down', body: body(alarm),
      trigger: { type: 'weekly', weekday: weekday + 1, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60 },
    });
  }

  for (const alarm of data.alarms) {
    if (!alarm.enabled || alarm.days.length > 0 || alarm.date === undefined) continue;
    const repeating = earliest.get(new Date(alarm.date).getDay() as Weekday);
    if (repeating && repeating.hour * 60 + repeating.minute <= alarm.hour * 60 + alarm.minute) continue;
    const at = alarm.date - before * MINUTE;
    if (at <= now) continue;
    out.push({ id: `bedtime:${alarm.id}`, kind: 'bedtime', alarmId: alarm.id, sound: 'chime', title: 'Time to wind down', body: body(alarm), trigger: { type: 'date', date: at } });
  }
  return out;
}

/**
 * "Last call for coffee": `caffeineHours` before bedtime on each alarm day,
 * where bedtime is the earliest alarm minus your sleep goal. Caffeine taken
 * 6 hours before bed still cuts sleep by about an hour (Drake et al., 2013).
 */
function caffeineReminders(data: AppData): PlannedNotification[] {
  const { settings } = data;
  const before = settings.sleepGoalMinutes + settings.caffeineHours * 60;
  const earliest = new Map<Weekday, Alarm>();
  for (const alarm of data.alarms) {
    if (!alarm.enabled) continue;
    for (const day of alarm.days) {
      const current = earliest.get(day);
      if (!current || alarm.hour * 60 + alarm.minute < current.hour * 60 + current.minute) earliest.set(day, alarm);
    }
  }
  const out: PlannedNotification[] = [];
  for (const [day, alarm] of earliest) {
    let minuteOfDay = alarm.hour * 60 + alarm.minute - before;
    let weekday = day as number;
    while (minuteOfDay < 0) {
      minuteOfDay += DAY_MINUTES;
      weekday = (weekday + 6) % 7;
    }
    const bed = (alarm.hour * 60 + alarm.minute - settings.sleepGoalMinutes + DAY_MINUTES * 2) % DAY_MINUTES;
    out.push({
      id: `caffeine:${day}`,
      kind: 'bedtime',
      alarmId: alarm.id,
      sound: 'chime',
      title: 'Last call for coffee',
      body: `Bedtime is ${formatClockText(Math.floor(bed / 60), bed % 60, settings.use24h)}. Caffeine after now can still be keeping you up then.`,
      trigger: { type: 'weekly', weekday: weekday + 1, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60 },
    });
  }
  return out;
}
