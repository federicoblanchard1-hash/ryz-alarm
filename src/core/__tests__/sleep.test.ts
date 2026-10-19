import { emptyData } from '../defaults';
import { addRecord, endSleep, formatDuration, lastNights, manualRecord, minutesAsleep, sleepStats, startSleep, wrapDay } from '../sleep';
import type { SleepRecord } from '../types';

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();
// Bedtimes before noon fall on the wake-up day itself.
const night = (day: number, bed: [number, number], wake: [number, number]): SleepRecord => ({ id: `n${day}`, start: at(bed[0] < 12 ? day : day - 1, ...bed), end: at(day, ...wake) });

describe('sleep sessions', () => {
  it('records a night from start to stop', () => {
    const started = startSleep(emptyData(true), at(4, 23));
    const { data, record } = endSleep(started, at(5, 7, 15));
    expect(data.sleepingSince).toBeNull();
    expect(record && minutesAsleep(record)).toBe(8 * 60 + 15);
    expect(data.sleep).toHaveLength(1);
  });

  it('drops sessions too short to be sleep', () => {
    const { data, record } = endSleep(startSleep(emptyData(true), at(5, 7)), at(5, 7, 5));
    expect(record).toBeNull();
    expect(data.sleep).toHaveLength(0);
  });

  it('keeps the longer of two sessions ending the same morning', () => {
    const long = night(5, [23, 0], [7, 0]);
    const short = { id: 'x', start: at(5, 7, 30), end: at(5, 8, 15) };
    expect(addRecord([long], short)).toEqual([long]);
  });

  it('builds a manual night across midnight', () => {
    const r = manualRecord(at(5, 0), { hour: 23, minute: 30 }, { hour: 6, minute: 45 });
    expect(r && minutesAsleep(r)).toBe(7 * 60 + 15);
    expect(manualRecord(at(5, 0), { hour: 7, minute: 0 }, { hour: 7, minute: 10 })).toBeNull();
  });
});

describe('stats', () => {
  const week = [night(1, [23, 0], [7, 0]), night(2, [0, 30], [7, 30]), night(3, [23, 30], [6, 30])];

  it('averages duration and bedtimes either side of midnight', () => {
    const s = sleepStats(week, 8 * 60)!;
    expect(s.averageMinutes).toBeCloseTo((480 + 420 + 420) / 3);
    expect(wrapDay(s.averageBed)).toEqual({ hour: 23, minute: 40 });
    expect(wrapDay(s.averageWake)).toEqual({ hour: 7, minute: 0 });
    expect(s.debtMinutes).toBe(120);
    expect(Math.round(s.wakeSpread)).toBe(24);
  });

  it('lays nights out one per day with gaps', () => {
    const slots = lastNights(week, at(4, 12), 7);
    expect(slots).toHaveLength(7);
    expect(slots.filter((s) => s.record).length).toBe(3);
    expect(slots[6].record).toBeNull();
  });

  it('formats durations', () => {
    expect(formatDuration(444)).toBe('7 h 24 min');
    expect(formatDuration(480)).toBe('8 h');
    expect(formatDuration(45)).toBe('45 min');
  });
});
