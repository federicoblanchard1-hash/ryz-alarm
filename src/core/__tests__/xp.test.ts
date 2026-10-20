import { emptyData, newAlarm, quickAlarm } from '../defaults';
import type { ActiveRing, AppData } from '../types';
import { SHOP, addXp, balance, cantRedeem, levelOf, redeem, reconcileXp, wakeXp } from '../xp';

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

  it('levels up and spends XP in the shop, up to a month ahead', () => {
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(350)).toEqual({ level: 3, into: 50, needed: 300 });
    const now = at(10, 12);
    const rich: AppData = { ...emptyData(true), xp: { earned: 5000, spent: 0, events: [] } };
    const month = redeem(rich, SHOP[2], now);
    expect(month.proUntil).toBe(now + 30 * 864e5);
    expect(balance(month.xp)).toBe(3000);
    expect(cantRedeem(month, SHOP[1], now)).toMatch(/month/);
    expect(redeem(month, SHOP[1], now)).toBe(month);
    expect(cantRedeem(emptyData(true), SHOP[0], now)).toMatch(/300 XP/);
  });
});
