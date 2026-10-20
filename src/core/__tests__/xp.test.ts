import { emptyData, newAlarm, quickAlarm } from '../defaults';
import type { ActiveRing, AppData } from '../types';
import { SHOP, addXp, applyWake, awakeCheckXp, balance, cantRedeem, levelOf, redeem, reconcileXp, streakDays, wakeXp } from '../xp';

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();
const ring = (time: number, snoozesUsed = 0): Extract<ActiveRing, { type: 'ring' }> =>
  snoozesUsed ? { type: 'ring', source: 'snooze', alarmId: 'a', at: time, eventId: 'e', snoozesUsed } : { type: 'ring', source: 'alarm', alarmId: 'a', at: time, snoozesUsed: 0 };
const alarm = { ...newAlarm('a'), missions: [{ type: 'math' as const, amount: 3, level: 1 as const }] };

function wakeOn(data: AppData, day: number, snoozes = 0, delay = 30_000) {
  const t = at(day, 7);
  return addXp(data, wakeXp(data, ring(t, snoozes), alarm, t + delay, 1, t + delay + 60_000));
}

describe('XP', () => {
  it('rewards getting up first time, fast, with missions', () => {
    const d = wakeOn(emptyData(true), 5);
    expect(d.xp.events.map((e) => e.reason).sort()).toEqual(['missions', 'no_snooze', 'quick_stop', 'woke']);
    expect(balance(d.xp)).toBe(10 + 15 + 10 + 5);
  });

  it('gives less after snoozing and nothing for test alarms, naps or a second wake-up that day', () => {
    const snoozed = wakeOn(emptyData(true), 5, 1, 5 * 60_000);
    expect(snoozed.xp.events.map((e) => e.reason).sort()).toEqual(['missions', 'woke']);
    const test: Extract<ActiveRing, { type: 'ring' }> = { type: 'ring', source: 'test', alarmId: 'test', at: at(5, 7), eventId: 't', snoozesUsed: 0 };
    expect(wakeXp(emptyData(true), test, alarm, at(5, 7), 0, at(5, 7))).toEqual([]);
    const nap = quickAlarm('n', at(5, 13), 20, 'gentle', 'gentle', true);
    expect(wakeXp(emptyData(true), ring(at(5, 14)), nap, at(5, 14), 0, at(5, 14))).toEqual([]);
    const once = wakeOn(emptyData(true), 5);
    expect(wakeXp(once, ring(at(5, 9)), alarm, at(5, 9), 0, at(5, 9))).toEqual([]);
  });

  it('pays a streak bonus on the seventh morning in a row', () => {
    let d = emptyData(true);
    for (let day = 1; day <= 7; day++) d = wakeOn(d, day);
    expect(d.xp.events.filter((e) => e.reason === 'streak')).toHaveLength(1);
    expect(d.xp.events.some((e) => e.reason === 'regular')).toBe(true);
  });

  it('rewards tracked nights once, and the sleep goal, but not typed-in nights', () => {
    const now = at(6, 9);
    const d: AppData = {
      ...emptyData(true),
      sleep: [
        { id: 'b', start: at(4, 23), end: at(5, 7, 5), source: 'button' },
        { id: 'm', start: at(5, 22), end: at(6, 7), source: 'manual' },
      ],
    };
    const once = reconcileXp(d, now);
    expect(once.xp.events.map((e) => e.reason).sort()).toEqual(['night_logged', 'sleep_goal']);
    expect(reconcileXp(once, now)).toBe(once);
  });

  it('levels up, and the shop sells one short Pro pass a month, never during a trial', () => {
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(350)).toEqual({ level: 3, into: 50, needed: 300 });
    const now = at(10, 12);
    const pass = SHOP.find((i) => i.id === 'pro3')!;
    const rich: AppData = { ...emptyData(true), xp: { earned: 9000, spent: 0, events: [] } };
    expect(cantRedeem({ ...rich, trialStartedAt: now - 864e5 }, pass, now)).toMatch(/trial/);
    const bought = redeem(rich, pass, now);
    expect(bought.proUntil).toBe(now + 3 * 864e5);
    expect(balance(bought.xp)).toBe(7500);
    const later = now + 5 * 864e5;
    expect(cantRedeem(bought, SHOP.find((i) => i.id === 'pro7')!, later)).toMatch(/Again in 25 days/);
    expect(cantRedeem(emptyData(true), pass, now)).toMatch(/1,500 XP to go|1500 XP to go/);
    expect(SHOP.some((i) => i.kind === 'pro' && i.days >= 30)).toBe(false);
  });

  it('sells a first-year discount and streak freezes that save a missed morning', () => {
    const now = at(10, 12);
    const rich: AppData = { ...emptyData(true), xp: { earned: 5000, spent: 0, events: [] } };
    const deal = redeem(rich, SHOP.find((i) => i.kind === 'discount')!, now);
    expect(deal.offer).toEqual({ percent: 40, until: now + 7 * 864e5 });
    let d = redeem(deal, SHOP.find((i) => i.kind === 'freeze')!, now);
    expect(d.xp.freezes).toBe(1);
    // Mornings on the 1st to the 5th, the 6th missed, then the 7th: the freeze covers the 6th.
    d = { ...d, xp: { ...d.xp, events: [] } };
    for (const day of [1, 2, 3, 4, 5]) d = applyWake(d, ring(at(day, 7)), alarm, at(day, 7), 0, at(day, 7, 1));
    d = applyWake(d, ring(at(7, 7)), alarm, at(7, 7), 0, at(7, 7, 1));
    expect(d.xp.freezes).toBe(0);
    expect(streakDays(d, at(7, 9))).toBe(7);
    expect(d.xp.events.some((e) => e.reason === 'streak')).toBe(true);
  });

  it('counts the awake check once a day, however many alarms', () => {
    const a = awakeCheckXp('one', at(5, 7));
    const b = awakeCheckXp('two', at(5, 8));
    expect(a.id).toBe(b.id);
  });
});
