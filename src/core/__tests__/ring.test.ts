import { emptyData, newAlarm } from '../defaults';
import { canSnooze, cleanup, confirmAwake, findActive, scheduleTest, snooze, stop } from '../ring';
import type { ActiveRing, Alarm, AppData } from '../types';

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 9, day, h, m, s).getTime();
const SEVEN = at(19, 7);
const MIN = 60_000;

function data(alarms: Alarm[]): AppData {
  return { ...emptyData(true), alarms };
}

function ringAt(d: AppData, now: number) {
  const active = findActive(d, now);
  if (active?.type !== 'ring') throw new Error(`expected a ring, got ${JSON.stringify(active)}`);
  return active as Extract<ActiveRing, { type: 'ring' }>;
}

describe('findActive', () => {
  const d = data([newAlarm('a')]);

  it('rings from the alarm time until ringMinutes is up', () => {
    expect(findActive(d, SEVEN - MIN)).toBeNull();
    expect(ringAt(d, SEVEN + 2_000)).toMatchObject({ source: 'alarm', alarmId: 'a', at: SEVEN });
    expect(findActive(d, SEVEN + 10 * MIN)).toBeNull();
  });

  it('counts a notification that lands a moment early, but not much earlier', () => {
    expect(ringAt(d, SEVEN - 1_500).at).toBe(SEVEN);
    expect(findActive(d, SEVEN - 4_000)).toBeNull();
  });

  it('stays quiet once that occurrence was stopped', () => {
    const stopped = stop(d, ringAt(d, SEVEN), SEVEN + MIN);
    expect(findActive(stopped, SEVEN + 2 * MIN)).toBeNull();
    // …but rings again the next weekday.
    expect(ringAt(stopped, at(20, 7)).at).toBe(at(20, 7));
  });
});

describe('snooze', () => {
  it('rings again after the snooze length and counts snoozes', () => {
    const alarm = { ...newAlarm('a'), snooze: { enabled: true, minutes: 9, limit: 2 } };
    let d = data([alarm]);
    d = snooze(d, ringAt(d, SEVEN), SEVEN);
    expect(findActive(d, SEVEN + 5 * MIN)).toBeNull();
    const second = ringAt(d, SEVEN + 9 * MIN);
    expect(second).toMatchObject({ source: 'snooze', snoozesUsed: 1 });

    d = snooze(d, second, SEVEN + 9 * MIN);
    const third = ringAt(d, SEVEN + 18 * MIN);
    expect(third.snoozesUsed).toBe(2);
    expect(canSnooze(alarm, third)).toBe(false);
    expect(snooze(d, third, SEVEN + 18 * MIN)).toBe(d);
  });

  it('turns a one-time alarm off but keeps its snooze', () => {
    const alarm = { ...newAlarm('a'), days: [], date: SEVEN };
    let d = data([alarm]);
    d = snooze(d, ringAt(d, SEVEN), SEVEN);
    expect(d.alarms[0].enabled).toBe(false);
    expect(ringAt(d, SEVEN + 9 * MIN).source).toBe('snooze');
  });
});

describe('awake check', () => {
  const alarm = { ...newAlarm('a'), awakeCheck: { enabled: true, delayMinutes: 5, answerMinutes: 3 } };

  it('asks after the delay, then rings again if nobody answers', () => {
    let d = data([alarm]);
    d = stop(d, ringAt(d, SEVEN), SEVEN + MIN);
    expect(findActive(d, SEVEN + 3 * MIN)).toBeNull();
    expect(findActive(d, SEVEN + 6 * MIN)).toMatchObject({ type: 'check', alarmId: 'a' });
    const recheck = ringAt(d, SEVEN + 9 * MIN);
    expect(recheck.source).toBe('recheck');
    expect(canSnooze(alarm, recheck)).toBe(false);

    // Stopping the re-ring doesn't ask again.
    d = stop(d, recheck, SEVEN + 9 * MIN);
    expect(d.pending).toEqual([]);
  });

  it('cancels the re-ring when you confirm', () => {
    let d = data([alarm]);
    d = stop(d, ringAt(d, SEVEN), SEVEN + MIN);
    d = confirmAwake(d, 'a');
    expect(d.pending).toEqual([]);
    expect(findActive(d, SEVEN + 9 * MIN)).toBeNull();
  });
});

describe('test alarm', () => {
  it('rings a minute later with the deep tone and no snooze', () => {
    const d = scheduleTest(data([]), SEVEN);
    const ring = ringAt(d, SEVEN + MIN);
    expect(ring.source).toBe('test');
    expect(stop(d, ring, SEVEN + MIN).pending).toEqual([]);
  });
});

describe('cleanup', () => {
  it('turns off a one-time alarm that rang out unanswered and drops old events', () => {
    const d: AppData = {
      ...data([{ ...newAlarm('a'), days: [], date: SEVEN }]),
      pending: [{ id: 'old', kind: 'snooze', alarmId: 'a', at: SEVEN, snoozesUsed: 1 }],
    };
    const cleaned = cleanup(d, SEVEN + 11 * MIN);
    expect(cleaned.alarms[0].enabled).toBe(false);
    expect(cleaned.pending).toEqual([]);
  });

  it('returns the same object when nothing changed', () => {
    const d = data([newAlarm('a')]);
    expect(cleanup(d, SEVEN)).toBe(d);
  });
});
