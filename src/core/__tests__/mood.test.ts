import { emptyData } from '../defaults';
import { addMood, latestToday, moodAndSleep, moodCounts, moodDay, moodWhen, moodsOn, monthGrid, sampleMoods } from '../mood';
import type { SleepRecord } from '../types';

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();
const day = (d: number) => at(d, 0);

describe('mood check-ins', () => {
  it('splits the day into a morning and an evening check-in', () => {
    expect(moodWhen(at(21, 7))).toBe('morning');
    expect(moodWhen(at(21, 22))).toBe('night');
    // Half past midnight is still the evening before.
    expect(moodWhen(at(22, 0, 30))).toBe('night');
    expect(moodDay({ at: at(22, 0, 30), when: 'night' })).toBe(day(21));
  });

  it('keeps one check-in of each kind a day, the latest', () => {
    let d = addMood(emptyData(true), 'tired', 'morning', at(21, 7));
    d = addMood(d, 'happy', 'morning', at(21, 8));
    d = addMood(d, 'calm', 'night', at(21, 23));
    const today = moodsOn(d.moods, day(21));
    expect(today.morning?.mood).toBe('happy');
    expect(today.night?.mood).toBe('calm');
    expect(d.moods).toHaveLength(2);
    expect(latestToday(d.moods, at(21, 23, 30))?.mood).toBe('calm');
  });

  it('counts moods in a month', () => {
    let d = addMood(emptyData(true), 'happy', 'morning', at(20, 7));
    d = addMood(d, 'happy', 'morning', at(21, 7));
    d = addMood(d, 'sad', 'night', at(21, 22));
    expect(moodCounts(d.moods, day(1), day(31))).toEqual([
      { id: 'happy', count: 2 },
      { id: 'sad', count: 1 },
    ]);
  });

  it('lays out a month from Sunday', () => {
    const weeks = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(new Date(weeks[0][4]!).getDate()).toBe(1);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it('compares morning mood after full and short nights', () => {
    const night = (d: number, hours: number): SleepRecord => ({ id: `n${d}`, start: at(d, 7) - hours * 3600_000, end: at(d, 7) });
    const sleep = [night(17, 8), night(18, 8), night(19, 5), night(20, 5)];
    let d = emptyData(true);
    d = addMood(d, 'happy', 'morning', at(17, 8));
    d = addMood(d, 'calm', 'morning', at(18, 8));
    d = addMood(d, 'tired', 'morning', at(19, 8));
    d = addMood(d, 'sad', 'morning', at(20, 8));
    const link = moodAndSleep(d.moods, sleep, 480);
    expect(link && link.rested).toBeGreaterThan(link!.short);
  });

  it('makes sample moods for each sample night', () => {
    const nights: SleepRecord[] = [{ id: 'a', start: at(20, 23) - 86_400_000 + 3600_000, end: at(21, 7) }];
    const moods = sampleMoods(nights, 480);
    expect(moods.map((m) => m.when)).toEqual(['morning', 'night']);
  });
});
