import type { AppData, SleepRecord } from './types';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
/** Shorter than this isn't a night's sleep, just a mis-tap or a nap. */
export const MIN_SLEEP_MS = 20 * MIN;
/** Longer than this, the session was surely left running. */
export const MAX_SLEEP_MS = 16 * 60 * MIN;
/** How many nights the history keeps. */
export const KEEP_NIGHTS = 120;

export function minutesAsleep(r: SleepRecord): number {
  return Math.round((r.end - r.start) / MIN);
}

/** "7 h 24 min", "45 min", "8 h". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

/** Midnight before the morning you woke, which names the night. */
export function nightKey(r: SleepRecord): number {
  const d = new Date(r.end);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startSleep(data: AppData, now: number): AppData {
  return { ...data, sleepingSince: now };
}

/**
 * Ends the running session. Too short is dropped, too long is cut to the
 * maximum; a second session the same morning replaces the first only if longer.
 */
export function endSleep(data: AppData, now: number): { data: AppData; record: SleepRecord | null } {
  if (data.sleepingSince === null) return { data, record: null };
  const start = data.sleepingSince;
  const end = Math.min(now, start + MAX_SLEEP_MS);
  if (end - start < MIN_SLEEP_MS) return { data: { ...data, sleepingSince: null }, record: null };
  const record: SleepRecord = { id: String(start), start, end };
  return { data: { ...data, sleepingSince: null, sleep: addRecord(data.sleep, record) }, record };
}

export function addRecord(list: SleepRecord[], record: SleepRecord): SleepRecord[] {
  const key = nightKey(record);
  const same = list.find((r) => nightKey(r) === key);
  if (same && minutesAsleep(same) >= minutesAsleep(record)) return list;
  return [...list.filter((r) => r !== same), record].sort((a, b) => a.end - b.end).slice(-KEEP_NIGHTS);
}

export function rateSleep(data: AppData, id: string, rating: SleepRecord['rating']): AppData {
  return { ...data, sleep: data.sleep.map((r) => (r.id === id ? { ...r, rating } : r)) };
}

/** A manual entry: bed at hh:mm the evening (or night) before, up at hh:mm on `wakeDay`. */
export function manualRecord(wakeDay: number, bed: { hour: number; minute: number }, wake: { hour: number; minute: number }): SleepRecord | null {
  const end = new Date(wakeDay);
  end.setHours(wake.hour, wake.minute, 0, 0);
  const start = new Date(end);
  start.setHours(bed.hour, bed.minute, 0, 0);
  if (start.getTime() >= end.getTime()) start.setDate(start.getDate() - 1);
  const ms = end.getTime() - start.getTime();
  if (ms < MIN_SLEEP_MS || ms > MAX_SLEEP_MS) return null;
  return { id: `m${start.getTime()}`, start: start.getTime(), end: end.getTime() };
}

/** Minutes after noon, so bedtimes either side of midnight average sensibly. */
function clockFromNoon(ms: number): number {
  const d = new Date(ms);
  return (((d.getHours() - 12 + 24) % 24) * 60 + d.getMinutes());
}
function clockFromMidnight(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const spread = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

export interface SleepStats {
  nights: number;
  averageMinutes: number;
  /** Minutes after midnight (may be negative or past 24 h for late/early bedtimes; wrap before showing). */
  averageBed: number;
  averageWake: number;
  /** Standard deviation of wake time, in minutes: how regular the mornings are. */
  wakeSpread: number;
  /** Goal minus sleep, summed over the nights; positive means short. */
  debtMinutes: number;
  rating: number | null;
}

/** The last `days` days of records, up to `now`. */
export function recent(list: SleepRecord[], now: number, days: number): SleepRecord[] {
  return list.filter((r) => r.end <= now && r.end > now - days * DAY);
}

export function sleepStats(list: SleepRecord[], goalMinutes: number): SleepStats | null {
  if (list.length === 0) return null;
  const minutes = list.map(minutesAsleep);
  const rated = list.filter((r) => r.rating).map((r) => r.rating as number);
  return {
    nights: list.length,
    averageMinutes: mean(minutes),
    averageBed: mean(list.map((r) => clockFromNoon(r.start))) + 12 * 60,
    averageWake: mean(list.map((r) => clockFromMidnight(r.end))),
    wakeSpread: list.length > 1 ? spread(list.map((r) => clockFromMidnight(r.end))) : 0,
    debtMinutes: minutes.reduce((sum, m) => sum + (goalMinutes - m), 0),
    rating: rated.length ? mean(rated) : null,
  };
}

/** Wrap minutes into one day, for showing an average clock time. */
export function wrapDay(minutes: number): { hour: number; minute: number } {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return { hour: Math.floor(m / 60), minute: m % 60 };
}

/** One slot per day for the chart, oldest first, empty where nothing was logged. */
export function lastNights(list: SleepRecord[], now: number, days: number): { day: number; record: SleepRecord | null }[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const byDay = new Map(list.map((r) => [nightKey(r), r]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return { day: d.getTime(), record: byDay.get(d.getTime()) ?? null };
  });
}

export const RATINGS: { value: NonNullable<SleepRecord['rating']>; label: string }[] = [
  { value: 1, label: 'Awful' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'OK' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];
