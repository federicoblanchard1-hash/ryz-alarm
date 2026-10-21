import { nextRing } from './next';
import { minutesAsleep, sleepDebt, type SleepTag } from './sleep';
import { HOUR, MINUTE } from './time';
import type { AppData, SleepRecord } from './types';

// "Today": how your day is likely to feel, from your own sleep, and when to
// do things. It's an estimate built on well-studied patterns, not a
// measurement:
// - Sleep inertia: grogginess for roughly 15–60 minutes after waking, longer
//   after short or broken sleep (Hilditch & McHill, 2019).
// - Alertness climbs through the morning, dips in the early afternoon (the
//   "post-lunch dip", which happens even without lunch; Monk, 2005) and has a
//   second wind in the early evening before falling toward bedtime.
// - Caffeine 6 hours before bed still cuts sleep by about an hour (Drake et
//   al., 2013).
// - Daylight in the first hours after waking anchors the body clock; more
//   daytime light goes with lower depression risk (Burns et al., 2023).
// - Sleep debt lowers the whole day (Van Dongen et al., 2003).

const DAY = 24 * HOUR;

export interface Window {
  from: number;
  to: number;
}

export interface DayPlan {
  /** When you woke up (or usually do). */
  wake: number;
  /** Where `wake` came from: last night, your usual time, or a default. */
  wakeFrom: 'night' | 'usual' | 'alarm' | 'default';
  /** Tonight's bedtime for your sleep goal before the next alarm (or 24 h after waking). */
  bed: number;
  groggyUntil: number;
  focus: Window;
  dip: Window;
  secondWind: Window;
  lastCoffee: number;
  windDown: number;
  /** Get daylight before this. */
  daylightBy: number;
  /** Energy from waking to bedtime, one point every 30 minutes, 0 (low) to 1 (high). */
  curve: { at: number; level: number }[];
  lastNightMinutes: number | null;
  debtMinutes: number;
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const minuteOfDay = (ms: number) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};
const round5 = (ms: number) => Math.round(ms / (5 * MINUTE)) * 5 * MINUTE;
const bell = (x: number, mid: number, width: number) => Math.exp(-(((x - mid) / width) ** 2) / 2);

/** The middle wake-up time (minutes after midnight) of the last two weeks, or null with under three nights. */
export function usualWake(list: SleepRecord[], now: number): number | null {
  const ends = list
    .filter((r) => r.end <= now && r.end > now - 14 * DAY)
    .map((r) => minuteOfDay(r.end))
    .sort((a, b) => a - b);
  if (ends.length < 3) return null;
  return ends[Math.floor(ends.length / 2)];
}

/** Energy at `hours` after waking: inertia first, a late-morning high, an early-afternoon dip, a second wind, then down toward bed. */
export function energyAt(hours: number, debtMinutes: number, shortMinutes: number): number {
  const tired = Math.min(0.2, (debtMinutes / 60) * 0.03) + Math.min(0.1, (shortMinutes / 60) * 0.04);
  const inertia = 0.45 * Math.exp(-hours / 0.45) * (1 + tired * 2);
  const level = 0.6 + 0.24 * bell(hours, 3.2, 1.7) - 0.17 * bell(hours, 7.5, 1.1) + 0.14 * bell(hours, 11, 1.4) - 0.04 * Math.max(0, hours - 12.5) - inertia - tired;
  return Math.min(1, Math.max(0.05, level));
}

/** Today's plan from your sleep, alarms and settings. `sleep` can be swapped for sample nights. */
export function planDay(data: AppData, now: number, sleep: SleepRecord[] = data.sleep): DayPlan {
  const { sleepGoalMinutes: goal, caffeineHours } = data.settings;
  const today = startOfDay(now);

  // Woken today already? Use that. Otherwise your usual time, today's first alarm, or 7:00.
  const lastNight = [...sleep].filter((r) => r.end >= today && r.end <= now).sort((a, b) => b.end - a.end)[0] ?? null;
  let wake: number;
  let wakeFrom: DayPlan['wakeFrom'];
  const usual = usualWake(sleep, now);
  const alarmToday = nextRing(data, today);
  if (lastNight) {
    wake = lastNight.end;
    wakeFrom = 'night';
  } else if (usual !== null) {
    wake = today + usual * MINUTE;
    wakeFrom = 'usual';
  } else if (alarmToday && alarmToday.at < today + 14 * HOUR) {
    wake = alarmToday.at;
    wakeFrom = 'alarm';
  } else {
    wake = today + 7 * HOUR;
    wakeFrom = 'default';
  }

  // Tonight: your goal before the next alarm at least 12 hours after waking, if there's one in the next day and a half.
  const next = nextRing(data, wake + 12 * HOUR);
  const bed = next && next.at - wake < 36 * HOUR ? Math.max(wake + 12 * HOUR, next.at - goal * MINUTE) : wake + DAY - goal * MINUTE;

  const debtMinutes = sleepDebt(sleep, goal, now).minutes;
  const lastNightMinutes = lastNight ? minutesAsleep(lastNight) : null;
  const shortMinutes = lastNightMinutes === null ? 0 : Math.max(0, goal - lastNightMinutes);

  // Grogginess: half an hour, plus up to half an hour more after short sleep or a lot of debt.
  const groggy = 30 + Math.min(30, shortMinutes / 6 + debtMinutes / 30);
  const at = (hours: number) => round5(wake + hours * HOUR);

  const curve: DayPlan['curve'] = [];
  for (let t = wake; t <= bed; t += 30 * MINUTE) curve.push({ at: t, level: energyAt((t - wake) / HOUR, debtMinutes, shortMinutes) });

  return {
    wake,
    wakeFrom,
    bed: round5(bed),
    groggyUntil: round5(wake + groggy * MINUTE),
    focus: { from: at(2), to: at(4.5) },
    dip: { from: at(6.75), to: at(8.25) },
    secondWind: { from: at(10), to: at(12) },
    lastCoffee: round5(bed - Math.max(6, caffeineHours) * HOUR),
    windDown: round5(bed - HOUR),
    daylightBy: at(2),
    curve,
    lastNightMinutes,
    debtMinutes,
  };
}

/** One step of today's plan, with whether it's past, happening now, or still to come. */
export interface PlanStep {
  id: 'groggy' | 'focus' | 'dip' | 'coffee' | 'second' | 'wind' | 'bed';
  from: number;
  to?: number;
  state: 'past' | 'now' | 'next';
}

export function planSteps(plan: DayPlan, now: number): PlanStep[] {
  const raw: Omit<PlanStep, 'state'>[] = [
    { id: 'groggy', from: plan.wake, to: plan.groggyUntil },
    { id: 'focus', from: plan.focus.from, to: plan.focus.to },
    { id: 'dip', from: plan.dip.from, to: plan.dip.to },
    { id: 'coffee', from: plan.lastCoffee },
    { id: 'second', from: plan.secondWind.from, to: plan.secondWind.to },
    { id: 'wind', from: plan.windDown, to: plan.bed },
    { id: 'bed', from: plan.bed },
  ];
  const steps = raw.sort((a, b) => a.from - b.from);
  return steps.map((s) => {
    const end = s.to ?? s.from + 30 * MINUTE;
    return { ...s, state: now >= end ? 'past' : now >= s.from ? 'now' : 'next' };
  });
}

// ---- Wake-up rhythm

export interface WakeRhythm {
  /** Your usual wake-up (minutes after midnight), or null with too few nights. */
  usual: number | null;
  /** Days in a row up within 30 minutes of the usual time. */
  streak: number;
  /** The last 7 days, oldest first: on time, off, or no night recorded. */
  week: ('on' | 'off' | 'none')[];
  /** How much wake-up time moves (average minutes away from usual) over the last week. */
  spread: number | null;
}

/** How regular your mornings are. Regular sleep goes with better long-term health than total sleep does (Windred et al., 2024). */
export function wakeRhythm(list: SleepRecord[], now: number): WakeRhythm {
  const usual = usualWake(list, now);
  const today = startOfDay(now);
  const dayOf = (offset: number) => list.filter((r) => r.end >= today - offset * DAY && r.end < today - (offset - 1) * DAY).sort((a, b) => b.end - a.end)[0];
  const status = (offset: number): 'on' | 'off' | 'none' => {
    const r = dayOf(offset);
    if (!r) return 'none';
    if (usual === null) return 'on';
    const diff = Math.abs(minuteOfDay(r.end) - usual);
    return Math.min(diff, 1440 - diff) <= 30 ? 'on' : 'off';
  };
  const week = [6, 5, 4, 3, 2, 1, 0].map(status);
  // Today only counts once you're up; until then the streak runs to yesterday.
  let streak = 0;
  for (let offset = status(0) === 'on' ? 0 : 1; offset < 120 && status(offset) === 'on'; offset++) streak++;
  const diffs = [0, 1, 2, 3, 4, 5, 6].map(dayOf).filter((r): r is SleepRecord => Boolean(r)).map((r) => {
    const diff = Math.abs(minuteOfDay(r.end) - (usual ?? 0));
    return Math.min(diff, 1440 - diff);
  });
  return { usual, streak: usual === null ? 0 : streak, week, spread: usual !== null && diffs.length >= 3 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null };
}

// ---- Sample nights

/**
 * Three weeks of made-up nights, so the Sleep tab and Today show what they
 * look like before you've tracked any. Deterministic, so the preview doesn't
 * jump around. Never saved.
 */
export function sampleNights(now: number, goalMinutes: number): SleepRecord[] {
  const today = startOfDay(now);
  // A small fixed pattern: a few short nights, a late weekend, mostly near the goal.
  const offsets = [10, -25, 5, -70, 15, 40, -10, 0, -45, 20, -15, 55, 5, -30, 10, -60, 0, 25, -20, 15, -5];
  const wakeShift = [0, 10, -5, 20, 0, 55, 70, -10, 5, 0, 15, 60, 45, 0, -5, 10, 0, 50, 65, 5, 0];
  const tags: (SleepTag[] | undefined)[] = [undefined, ['caffeine'], ['exercise'], ['screens', 'caffeine'], undefined, ['alcohol'], undefined, ['exercise'], ['caffeine'], undefined, ['exercise'], ['alcohol', 'late_meal'], undefined, ['caffeine'], ['exercise'], ['stress', 'screens'], undefined, ['exercise'], ['alcohol'], undefined, ['exercise']];
  const out: SleepRecord[] = [];
  for (let i = 0; i < offsets.length; i++) {
    // Last night first; if it's still early, the first sample night is yesterday's.
    const day = today - i * DAY - (now < today + 7 * HOUR + wakeShift[0] * MINUTE ? DAY : 0);
    const end = day + 7 * HOUR + wakeShift[i] * MINUTE;
    const minutes = goalMinutes + offsets[i];
    const rating = (minutes >= goalMinutes ? 4 : minutes >= goalMinutes - 40 ? 3 : 2) as SleepRecord['rating'];
    out.push({ id: `sample-${i}`, start: end - minutes * MINUTE, end, rating, source: i % 3 === 0 ? 'watch' : 'button', tags: tags[i] });
  }
  return out.reverse();
}

/** The nights to show: yours, or sample ones while the preview is on and you have fewer than three. */
export function nightsToShow(data: AppData, now: number): { nights: SleepRecord[]; sample: boolean } {
  if (data.settings.sampleSleep && data.sleep.length < 3) return { nights: sampleNights(now, data.settings.sleepGoalMinutes), sample: true };
  return { nights: data.sleep, sample: false };
}
