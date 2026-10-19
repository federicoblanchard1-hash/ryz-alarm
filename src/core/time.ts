import type { Alarm, Weekday } from './types';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Local time `hour:minute`, `dayOffset` days after `base`'s date. */
export function clockOn(base: number, dayOffset: number, hour: number, minute: number): number {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/** The next time `hour:minute` comes round, strictly after `now`. */
export function nextClock(hour: number, minute: number, now: number): number {
  const today = clockOn(now, 0, hour, minute);
  return today > now ? today : clockOn(now, 1, hour, minute);
}

/** When the alarm rings next, strictly after `now`; null if it never will. */
export function nextOccurrence(alarm: Alarm, now: number): number | null {
  if (!alarm.enabled) return null;
  if (alarm.days.length === 0) return alarm.date !== undefined && alarm.date > now ? alarm.date : null;
  for (let offset = 0; offset <= 7; offset++) {
    const t = clockOn(now, offset, alarm.hour, alarm.minute);
    if (t > now && alarm.days.includes(new Date(t).getDay() as Weekday)) return t;
  }
  return null;
}

/** The latest time the alarm rang, at or before `now`; null if never. */
export function previousOccurrence(alarm: Alarm, now: number): number | null {
  if (!alarm.enabled) return null;
  if (alarm.days.length === 0) return alarm.date !== undefined && alarm.date <= now ? alarm.date : null;
  for (let offset = 0; offset >= -7; offset--) {
    const t = clockOn(now, offset, alarm.hour, alarm.minute);
    if (t <= now && alarm.days.includes(new Date(t).getDay() as Weekday)) return t;
  }
  return null;
}

export function formatClock(hour: number, minute: number, use24h: boolean): { time: string; period: string } {
  const mm = String(minute).padStart(2, '0');
  if (use24h) return { time: `${String(hour).padStart(2, '0')}:${mm}`, period: '' };
  return { time: `${hour % 12 === 0 ? 12 : hour % 12}:${mm}`, period: hour < 12 ? 'AM' : 'PM' };
}

export function formatClockText(hour: number, minute: number, use24h: boolean): string {
  const { time, period } = formatClock(hour, minute, use24h);
  return period ? `${time} ${period}` : time;
}

export function formatDays(days: Weekday[]): string {
  if (days.length === 0) return 'Once';
  if (days.length === 7) return 'Every day';
  const set = new Set(days);
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d as Weekday))) return 'Weekdays';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
  return WEEK_ORDER.filter((d) => set.has(d)).map((d) => DAY_SHORT[d]).join(', ');
}

/** "8 h 12 min", "45 min", "less than a minute". */
export function formatSpan(ms: number): string {
  const totalMinutes = Math.floor(ms / MINUTE);
  if (totalMinutes < 1) return 'less than a minute';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
