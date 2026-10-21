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
  const record: SleepRecord = { id: String(start), start, end, source: 'button' };
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
  return { id: `m${start.getTime()}`, start: start.getTime(), end: end.getTime(), source: 'manual' };
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

// ---- Smartwatch nights

/** Pieces of sleep this close together belong to the same night. */
const SAME_NIGHT_GAP = 90 * MIN;

/**
 * Turns the asleep intervals a watch reports (often many short pieces, split
 * by awakenings or sleep stages) into nights: from falling asleep to the
 * last wake-up, keeping only real nights.
 */
export function nightsFromIntervals(intervals: { start: number; end: number }[]): SleepRecord[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const nights: SleepRecord[] = [];
  let current: { start: number; end: number } | null = null;
  const flush = () => {
    if (current && current.end - current.start >= 2 * 60 * MIN) {
      const end = Math.min(current.end, current.start + MAX_SLEEP_MS);
      nights.push({ id: `w${current.start}`, start: current.start, end, source: 'watch' });
    }
  };
  for (const i of sorted) {
    if (current && i.start - current.end <= SAME_NIGHT_GAP) current.end = Math.max(current.end, i.end);
    else {
      flush();
      current = { ...i };
    }
  }
  flush();
  return nights;
}

/** Adds nights from a watch; a night logged by hand or button that day keeps its rating. */
export function mergeWatchNights(list: SleepRecord[], nights: SleepRecord[]): SleepRecord[] {
  let out = list;
  for (const n of nights) {
    const same = out.find((r) => nightKey(r) === nightKey(n));
    if (same?.source === 'watch' && same.start === n.start && same.end === n.end) continue;
    // The watch measured it, so it replaces a guess, keeping how you said you felt.
    out = [...out.filter((r) => r !== same), { ...n, rating: same?.rating }].sort((a, b) => a.end - b.end).slice(-KEEP_NIGHTS);
  }
  return out;
}

// ---- Ranges and grouping for the chart

export interface Bucket {
  /** Start of the bucket (ms), also its key. */
  start: number;
  /** One night, a week or a month. */
  size: 'night' | 'week' | 'month';
  /** Average minutes asleep over the logged nights in it; null if none. */
  minutes: number | null;
  nights: SleepRecord[];
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Records whose morning falls between two days (inclusive). */
export function between(list: SleepRecord[], fromDay: number, toDay: number): SleepRecord[] {
  const from = startOfDay(fromDay);
  const to = startOfDay(toDay) + DAY;
  return list.filter((r) => r.end >= from && r.end < to);
}

/**
 * Chart columns for a range: one per night up to a month, one per week up to
 * about four months, and one per month beyond, each the average of its nights.
 */
export function buckets(list: SleepRecord[], fromDay: number, toDay: number): Bucket[] {
  const from = startOfDay(fromDay);
  const to = startOfDay(toDay);
  const days = Math.round((to - from) / DAY) + 1;
  const size: Bucket['size'] = days <= 31 ? 'night' : days <= 120 ? 'week' : 'month';
  const starts: number[] = [];
  if (size === 'night') for (let d = new Date(from); d.getTime() <= to; d.setDate(d.getDate() + 1)) starts.push(d.getTime());
  else if (size === 'week') {
    const d = new Date(from);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    for (; d.getTime() <= to; d.setDate(d.getDate() + 7)) starts.push(d.getTime());
  } else {
    const d = new Date(from);
    d.setDate(1);
    for (; d.getTime() <= to; d.setMonth(d.getMonth() + 1)) starts.push(d.getTime());
  }
  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : to + DAY;
    const nights = list.filter((r) => r.end >= Math.max(start, from) && r.end < end);
    return { start, size, minutes: nights.length ? mean(nights.map(minutesAsleep)) : null, nights };
  });
}

export interface MoreStats {
  longest: SleepRecord;
  shortest: SleepRecord;
  /** Share of nights that reached the goal, 0–1. */
  onGoal: number;
  /** Bedtime spread (standard deviation), minutes. */
  bedSpread: number;
  /**
   * Social jet lag: how much later the middle of your sleep falls on
   * weekends than on weekdays, in minutes (Wittmann et al., 2006). Null
   * without both kinds of nights.
   */
  socialJetLag: number | null;
}

export function moreStats(list: SleepRecord[], goalMinutes: number): MoreStats | null {
  if (list.length === 0) return null;
  const byLength = [...list].sort((a, b) => minutesAsleep(b) - minutesAsleep(a));
  const mid = (r: SleepRecord) => clockFromNoon(r.start + (r.end - r.start) / 2);
  // A night "is" a weekend night when the morning after is Saturday or Sunday.
  const weekend = list.filter((r) => [0, 6].includes(new Date(r.end).getDay()));
  const weekdays = list.filter((r) => ![0, 6].includes(new Date(r.end).getDay()));
  return {
    longest: byLength[0],
    shortest: byLength[byLength.length - 1],
    onGoal: list.filter((r) => minutesAsleep(r) >= goalMinutes - 10).length / list.length,
    bedSpread: list.length > 1 ? spread(list.map((r) => clockFromNoon(r.start))) : 0,
    socialJetLag: weekend.length && weekdays.length ? mean(weekend.map(mid)) - mean(weekdays.map(mid)) : null,
  };
}

// ---- Sleep debt

export interface SleepDebt {
  /** Minutes short of the goal, added up over the window (nights over the goal pay a little back). */
  minutes: number;
  /** Nights recorded in the window. */
  nights: number;
  days: number;
}

/**
 * Sleep debt over the last `days` days: the minutes each recorded night fell
 * short of the goal. Extra sleep pays back at most an hour a night, since
 * one long lie-in doesn't undo a short week (Van Dongen et al., 2003;
 * Depner et al., 2019).
 */
export function sleepDebt(list: SleepRecord[], goalMinutes: number, now: number, days = 14): SleepDebt {
  const nights = recent(list, now, days);
  let minutes = 0;
  for (const r of nights) {
    const diff = goalMinutes - minutesAsleep(r);
    minutes += diff > 0 ? diff : Math.max(diff, -60);
  }
  return { minutes: Math.max(0, minutes), nights: nights.length, days };
}

// ---- Night notes

export type SleepTag = 'caffeine' | 'alcohol' | 'exercise' | 'late_meal' | 'screens' | 'stress' | 'nap' | 'new_place';

/** Things that change sleep, each with what research says about it. */
export const SLEEP_TAGS: { id: SleepTag; title: string; why: string }[] = [
  { id: 'caffeine', title: 'Caffeine after 2 pm', why: 'Caffeine even 6 hours before bed can cut sleep by an hour (Drake et al., 2013).' },
  { id: 'alcohol', title: 'Alcohol', why: 'Alcohol helps you fall asleep but breaks up the second half of the night (Ebrahim et al., 2013).' },
  { id: 'exercise', title: 'Exercise', why: 'Regular exercise tends to deepen sleep (Kredlow et al., 2015).' },
  { id: 'late_meal', title: 'Late meal', why: 'A big meal close to bedtime can make it harder to fall asleep.' },
  { id: 'screens', title: 'Screens in bed', why: 'Phones and tablets in bed delay sleep (Chang et al., 2015).' },
  { id: 'stress', title: 'Stress', why: 'Worry keeps the brain alert at bedtime.' },
  { id: 'nap', title: 'Nap', why: 'Long or late naps lower sleep pressure at night.' },
  { id: 'new_place', title: 'New place', why: 'The first night somewhere new is lighter: half the brain stays on watch (Tamaki et al., 2016).' },
];

export interface TagEffect {
  tag: SleepTag;
  /** Nights with and without the tag. */
  with: number;
  without: number;
  /** Average sleep with the tag minus without, in minutes. */
  minutes: number;
  /** Average rating with the tag minus without, if both have ratings. */
  rating: number | null;
}

/**
 * How each tag goes with your sleep: the difference in average sleep (and
 * how rested you felt) between nights with it and without it. Needs at
 * least `minNights` of each, so one odd night doesn't decide. Biggest
 * effects first.
 */
export function tagEffects(list: SleepRecord[], minNights = 3): TagEffect[] {
  const out: TagEffect[] = [];
  for (const { id } of SLEEP_TAGS) {
    const withTag = list.filter((r) => r.tags?.includes(id));
    // Only nights you've tagged at all count as "without", so untagged history doesn't skew it.
    const without = list.filter((r) => r.tags && !r.tags.includes(id));
    if (withTag.length < minNights || without.length < minNights) continue;
    const avg = (rs: SleepRecord[]) => mean(rs.map(minutesAsleep));
    const rated = (rs: SleepRecord[]) => rs.filter((r) => r.rating).map((r) => r.rating as number);
    const rw = rated(withTag);
    const ro = rated(without);
    out.push({
      tag: id,
      with: withTag.length,
      without: without.length,
      minutes: Math.round(avg(withTag) - avg(without)),
      rating: rw.length >= minNights && ro.length >= minNights ? Math.round((mean(rw) - mean(ro)) * 10) / 10 : null,
    });
  }
  return out.sort((a, b) => Math.abs(b.minutes) - Math.abs(a.minutes));
}

export function tagNight(data: AppData, id: string, tags: SleepTag[]): AppData {
  return { ...data, sleep: data.sleep.map((r) => (r.id === id ? { ...r, tags } : r)) };
}

// ---- Sleep sounds

export type SleepSoundId = 'rain' | 'ocean' | 'stream' | 'forest' | 'pink_noise' | 'brown_noise';

export const SLEEP_SOUNDS: { id: SleepSoundId; title: string }[] = [
  { id: 'rain', title: 'Rain' },
  { id: 'ocean', title: 'Ocean' },
  { id: 'stream', title: 'Stream' },
  { id: 'forest', title: 'Forest' },
  { id: 'pink_noise', title: 'Pink noise' },
  { id: 'brown_noise', title: 'Brown noise' },
];

/** Timer choices in minutes; 0 plays all night. */
export const SLEEP_TIMERS = [15, 30, 45, 60, 90, 0];

/** The last minute fades out, so the stop doesn't wake you. */
export const SLEEP_FADE_MS = 60_000;

/** The volume `elapsedMs` into a sleep sound that lasts `minutes` (0 = no end). */
export function sleepSoundVolume(elapsedMs: number, minutes: number, volume: number): number {
  if (minutes === 0) return volume;
  const left = minutes * MIN - elapsedMs;
  if (left <= 0) return 0;
  return left >= SLEEP_FADE_MS ? volume : volume * (left / SLEEP_FADE_MS);
}
