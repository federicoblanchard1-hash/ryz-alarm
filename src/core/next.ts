import { defaultAlarmFor } from './ring';
import { HOUR, MINUTE, formatClockText, formatHours, formatSpan, nextOccurrence } from './time';
import type { Alarm, AppData } from './types';

export interface NextRing {
  at: number;
  alarm: Alarm;
  snoozed: boolean;
}

/** The soonest thing that will ring: an alarm or a snooze. */
export function nextRing(data: AppData, now: number): NextRing | null {
  let best: NextRing | null = null;
  for (const alarm of data.alarms) {
    const at = nextOccurrence(alarm, now);
    if (at !== null && (!best || at < best.at)) best = { at, alarm, snoozed: false };
  }
  for (const event of data.pending) {
    const alarm = defaultAlarmFor(data, event.alarmId);
    if (event.kind === 'snooze' && event.at > now && alarm && (!best || event.at < best.at)) best = { at: event.at, alarm, snoozed: true };
  }
  return best;
}

/** When to go to bed for the sleep goal, or how much sleep is still possible. */
export function sleepAdvice(at: number, now: number, goalMinutes: number, use24h: boolean): string | null {
  if (at - now > 24 * HOUR) return null;
  const bedtime = at - goalMinutes * MINUTE;
  if (now < bedtime) {
    const d = new Date(bedtime);
    return `Be in bed by ${formatClockText(d.getHours(), d.getMinutes(), use24h)} for ${formatHours(goalMinutes)} of sleep.`;
  }
  // Under an hour left it's a nap or the morning, not a night to plan.
  return at - now >= HOUR ? `You can still get ${formatSpan(at - now)} of sleep. Head to bed soon.` : null;
}
