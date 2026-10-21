import { minutesAsleep } from './sleep';
import type { AppData, SleepRecord } from './types';

// Mood check-ins: one after you finish your missions in the morning, one
// before bed. A calendar of them shows how your mornings and evenings go,
// and next to your sleep, how much a good night changes your mood.

export type MoodId = 'happy' | 'calm' | 'okay' | 'tired' | 'sad' | 'stressed' | 'angry';
export type MoodWhen = 'morning' | 'night';

export interface MoodEntry {
  id: string;
  at: number;
  when: MoodWhen;
  mood: MoodId;
}

/**
 * In the order the picker shows them. `icon` is a black-and-white face from
 * Material Community Icons, to match the app; `score` (1–5) is only for
 * comparing days.
 */
export const MOODS: { id: MoodId; icon: string; label: string; score: number }[] = [
  { id: 'happy', icon: 'emoticon-excited-outline', label: 'Happy', score: 5 },
  { id: 'calm', icon: 'emoticon-outline', label: 'Calm', score: 4 },
  { id: 'okay', icon: 'emoticon-neutral-outline', label: 'Okay', score: 3 },
  { id: 'tired', icon: 'sleep', label: 'Tired', score: 2 },
  { id: 'sad', icon: 'emoticon-sad-outline', label: 'Sad', score: 1 },
  { id: 'stressed', icon: 'emoticon-confused-outline', label: 'Stressed', score: 1.5 },
  { id: 'angry', icon: 'emoticon-angry-outline', label: 'Angry', score: 1 },
];

export const MOOD = Object.fromEntries(MOODS.map((m) => [m.id, m])) as Record<MoodId, (typeof MOODS)[number]>;

const DAY = 24 * 60 * 60_000;

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Which check-in a time belongs to: mornings until 3 pm, then the evening one (late nights count for the day before). */
export function moodWhen(ms: number): MoodWhen {
  const h = new Date(ms).getHours();
  return h >= 4 && h < 15 ? 'morning' : 'night';
}

/** The day a check-in belongs to: an evening one after midnight still counts for the day before. */
export function moodDay(entry: Pick<MoodEntry, 'at' | 'when'>): number {
  const day = startOfDay(entry.at);
  return entry.when === 'night' && new Date(entry.at).getHours() < 4 ? day - DAY : day;
}

/** Saves a check-in, replacing the same day's one of the same kind. */
export function addMood(data: AppData, mood: MoodId, when: MoodWhen, now: number): AppData {
  const entry: MoodEntry = { id: `${when}:${now}`, at: now, when, mood };
  const day = moodDay(entry);
  const kept = (data.moods ?? []).filter((m) => !(m.when === when && moodDay(m) === day));
  return { ...data, moods: [...kept, entry].sort((a, b) => a.at - b.at).slice(-800) };
}

/** A day's two check-ins. */
export function moodsOn(list: MoodEntry[], day: number): { morning?: MoodEntry; night?: MoodEntry } {
  const out: { morning?: MoodEntry; night?: MoodEntry } = {};
  for (const m of list) if (moodDay(m) === day) out[m.when] = m;
  return out;
}

/** Today's latest check-in, for the Morning tile. */
export function latestToday(list: MoodEntry[], now: number): MoodEntry | null {
  const today = moodsOn(list, moodDay({ at: now, when: moodWhen(now) }));
  return today.night ?? today.morning ?? null;
}

/** The weeks of a month for a calendar, Sunday first; null for the padding days. */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d).getTime());
  while (cells.length % 7) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** How often each mood came up between two days. */
export function moodCounts(list: MoodEntry[], from: number, to: number): { id: MoodId; count: number }[] {
  const counts = new Map<MoodId, number>();
  for (const m of list) {
    const day = moodDay(m);
    if (day >= from && day <= to) counts.set(m.mood, (counts.get(m.mood) ?? 0) + 1);
  }
  return MOODS.map((m) => ({ id: m.id, count: counts.get(m.id) ?? 0 })).filter((c) => c.count > 0);
}

/**
 * Morning mood after nights at or over your goal against nights under it.
 * Null until there are at least two mornings of each.
 */
export function moodAndSleep(moods: MoodEntry[], sleep: SleepRecord[], goalMinutes: number): { rested: number; short: number } | null {
  const rested: number[] = [];
  const short: number[] = [];
  for (const m of moods) {
    if (m.when !== 'morning') continue;
    const day = moodDay(m);
    const night = sleep.find((r) => startOfDay(r.end) === day);
    if (!night) continue;
    (minutesAsleep(night) >= goalMinutes - 15 ? rested : short).push(MOOD[m.mood].score);
  }
  if (rested.length < 2 || short.length < 2) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return { rested: avg(rested), short: avg(short) };
}

/** Made-up check-ins to go with the sample nights: better mornings after longer nights. Never saved. */
export function sampleMoods(nights: SleepRecord[], goalMinutes: number): MoodEntry[] {
  const evening: MoodId[] = ['calm', 'happy', 'tired', 'okay', 'calm', 'stressed', 'happy'];
  const out: MoodEntry[] = [];
  nights.forEach((n, i) => {
    const mins = minutesAsleep(n);
    const morning: MoodId = mins >= goalMinutes ? (i % 3 ? 'happy' : 'calm') : mins >= goalMinutes - 40 ? 'okay' : i % 2 ? 'tired' : 'sad';
    out.push({ id: `sample-m${i}`, at: n.end + 20 * 60_000, when: 'morning', mood: morning });
    const bed = n.start;
    out.push({ id: `sample-n${i}`, at: bed - 10 * 60_000, when: 'night', mood: evening[i % evening.length] });
  });
  return out;
}
