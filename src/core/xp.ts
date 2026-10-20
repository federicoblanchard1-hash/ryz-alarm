import { minutesAsleep, nightKey } from './sleep';
import type { ActiveRing, Alarm, AppData } from './types';

// XP rewards good mornings and good nights. It works like coins: spend it in
// the shop on free days of Ryz Pro. Every award has an id, so the same
// morning or night can't be counted twice.

export type XpReason = 'woke' | 'no_snooze' | 'quick_stop' | 'missions' | 'awake_check' | 'sleep_goal' | 'night_logged' | 'regular' | 'streak' | 'redeem';

export interface XpEvent {
  id: string;
  at: number;
  amount: number;
  reason: XpReason;
}

export interface XpState {
  /** All XP ever earned. */
  earned: number;
  /** XP spent in the shop. */
  spent: number;
  /** Recent awards and purchases, oldest first (the last 200). */
  events: XpEvent[];
}

export const EMPTY_XP: XpState = { earned: 0, spent: 0, events: [] };

/** How to earn XP, in the order the XP screen lists it. */
export const XP_RULES: { reason: Exclude<XpReason, 'redeem'>; title: string; amount: number; text: string }[] = [
  { reason: 'woke', title: 'Get up with your alarm', amount: 10, text: 'Once a day, when you stop an alarm (not test alarms or naps).' },
  { reason: 'no_snooze', title: 'No snooze', amount: 15, text: 'Up the first time, without snoozing.' },
  { reason: 'quick_stop', title: 'Up within a minute', amount: 10, text: 'Stop the alarm, or start its missions, in the first minute.' },
  { reason: 'missions', title: 'Missions done', amount: 5, text: 'For each mission you finish.' },
  { reason: 'awake_check', title: 'Pass the awake check', amount: 10, text: 'Answer “Are you awake?” in time.' },
  { reason: 'regular', title: 'Regular wake-up', amount: 10, text: 'Wake within 30 minutes of your usual time.' },
  { reason: 'night_logged', title: 'Track a night', amount: 5, text: 'Any night tracked with the button or a smartwatch.' },
  { reason: 'sleep_goal', title: 'Reach your sleep goal', amount: 25, text: 'A tracked night at or above your goal.' },
  { reason: 'streak', title: '7-day streak', amount: 50, text: 'Every seventh morning in a row without snoozing.' },
];

const AMOUNT = Object.fromEntries(XP_RULES.map((r) => [r.reason, r.amount])) as Record<Exclude<XpReason, 'redeem'>, number>;
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const KEEP = 200;

export function balance(xp: XpState): number {
  return xp.earned - xp.spent;
}

/** Level n needs 100 × n XP more than level n − 1: 100, 300, 600, 1000… */
export function levelOf(earned: number): { level: number; into: number; needed: number } {
  let level = 1;
  let floor = 0;
  while (earned >= floor + level * 100) {
    floor += level * 100;
    level += 1;
  }
  return { level, into: earned - floor, needed: level * 100 };
}

/** Adds awards that aren't there yet; returns the same object when nothing is new. */
export function addXp(data: AppData, events: XpEvent[]): AppData {
  const known = new Set(data.xp.events.map((e) => e.id));
  const fresh = events.filter((e) => !known.has(e.id));
  if (fresh.length === 0) return data;
  const earned = fresh.filter((e) => e.amount > 0).reduce((n, e) => n + e.amount, 0);
  const spent = fresh.filter((e) => e.amount < 0).reduce((n, e) => n - e.amount, 0);
  return {
    ...data,
    xp: { earned: data.xp.earned + earned, spent: data.xp.spent + spent, events: [...data.xp.events, ...fresh].slice(-KEEP) },
  };
}

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const minuteOfDay = (ms: number) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * XP for stopping an alarm. `respondedAt` is when you first pressed Stop (or
 * started the missions); `missionsDone` how many you finished. Test alarms
 * and naps earn nothing, and only one wake-up a day counts.
 */
export function wakeXp(data: AppData, ring: Extract<ActiveRing, { type: 'ring' }>, alarm: Alarm, respondedAt: number, missionsDone: number, now: number): XpEvent[] {
  if (ring.source === 'test' || alarm.quick) return [];
  const lastWake = [...data.xp.events].reverse().find((e) => e.reason === 'woke');
  if (lastWake && now - lastWake.at < 6 * HOUR) return [];
  const day = dayKey(now);
  const id = (reason: XpReason) => `${reason}:${day}`;
  const events: XpEvent[] = [{ id: id('woke'), at: now, amount: AMOUNT.woke, reason: 'woke' }];
  const noSnooze = ring.snoozesUsed === 0 && ring.source === 'alarm';
  if (noSnooze) events.push({ id: id('no_snooze'), at: now, amount: AMOUNT.no_snooze, reason: 'no_snooze' });
  if (respondedAt - ring.at <= 60_000) events.push({ id: id('quick_stop'), at: now, amount: AMOUNT.quick_stop, reason: 'quick_stop' });
  if (missionsDone > 0) events.push({ id: id('missions'), at: now, amount: AMOUNT.missions * missionsDone, reason: 'missions' });

  // Regular: within 30 minutes of the average of the last week's wake-ups.
  const recent = data.xp.events.filter((e) => e.reason === 'woke' && now - e.at < 8 * DAY);
  if (recent.length >= 3) {
    const usual = recent.reduce((n, e) => n + minuteOfDay(e.at), 0) / recent.length;
    if (Math.abs(minuteOfDay(now) - usual) <= 30) events.push({ id: id('regular'), at: now, amount: AMOUNT.regular, reason: 'regular' });
  }

  // Streak: mornings in a row without snoozing, counting today.
  if (noSnooze) {
    const days = new Set(data.xp.events.filter((e) => e.reason === 'no_snooze').map((e) => dayKey(e.at)));
    days.add(day);
    let streak = 0;
    for (let t = now; days.has(dayKey(t)); t -= DAY) streak++;
    if (streak > 0 && streak % 7 === 0) events.push({ id: id('streak'), at: now, amount: AMOUNT.streak, reason: 'streak' });
  }
  return events;
}

export function awakeCheckXp(alarmId: string, now: number): XpEvent {
  return { id: `awake_check:${dayKey(now)}:${alarmId}`, at: now, amount: AMOUNT.awake_check, reason: 'awake_check' };
}

/**
 * XP for the last week's tracked nights, worked out from the sleep log, so
 * it doesn't matter how a night arrived (button, alarm or watch). Nights
 * typed in by hand don't count, or anyone could type their way to Pro.
 */
export function sleepXp(data: AppData, now: number): XpEvent[] {
  const goal = data.settings.sleepGoalMinutes;
  return data.sleep
    .filter((r) => now - r.end < 7 * DAY && (r.source === 'button' || r.source === 'watch'))
    .flatMap((r) => {
      const night = nightKey(r);
      const events: XpEvent[] = [{ id: `night:${night}`, at: r.end, amount: AMOUNT.night_logged, reason: 'night_logged' }];
      if (minutesAsleep(r) >= goal - 10) events.push({ id: `goal:${night}`, at: r.end, amount: AMOUNT.sleep_goal, reason: 'sleep_goal' });
      return events;
    });
}

/** Run after every change: awards any nights that newly qualify. */
export function reconcileXp(data: AppData, now: number): AppData {
  return addXp(data, sleepXp(data, now));
}

// ---- Shop

/** Free Pro for XP. Free days can be held for at most a month ahead. */
export const SHOP: { days: number; cost: number; title: string }[] = [
  { days: 3, cost: 750, title: '3 days of Pro' },
  { days: 7, cost: 1250, title: '1 week of Pro' },
  { days: 30, cost: 5000, title: '1 month of Pro' },
];
export const MAX_FREE_DAYS = 31;

export function proActive(data: AppData, now: number): boolean {
  return data.proUntil !== null && data.proUntil > now;
}

/** Why an item can't be bought right now, or null if it can. */
export function cantRedeem(data: AppData, item: (typeof SHOP)[number], now: number): string | null {
  if (balance(data.xp) < item.cost) return `${item.cost - balance(data.xp)} XP to go`;
  const until = Math.max(now, data.proUntil ?? 0) + item.days * DAY;
  if (until > now + MAX_FREE_DAYS * DAY) return 'You can hold up to a month of free Pro';
  return null;
}

export function redeem(data: AppData, item: (typeof SHOP)[number], now: number): AppData {
  if (cantRedeem(data, item, now)) return data;
  const spent = addXp(data, [{ id: `redeem:${now}`, at: now, amount: -item.cost, reason: 'redeem' }]);
  return { ...spent, proUntil: Math.max(now, data.proUntil ?? 0) + item.days * DAY };
}
