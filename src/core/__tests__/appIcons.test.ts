import { APP_ICONS, easter, iconToSuggest, seasonFor, seasonKey } from '../appIcons';

const on = (m: number, d: number, y = 2026) => new Date(y, m - 1, d, 12).getTime();

describe('seasonal icons', () => {
  it('knows the holidays and seasons', () => {
    expect(seasonFor(on(10, 31))).toBe('halloween');
    expect(seasonFor(on(12, 24))).toBe('christmas');
    expect(seasonFor(on(12, 31))).toBe('new-year');
    expect(seasonFor(on(1, 3))).toBe('new-year');
    expect(seasonFor(on(2, 14))).toBe('valentines');
    expect(seasonFor(on(2, 28))).toBe('winter');
    expect(seasonFor(on(4, 10))).toBe('spring');
    expect(seasonFor(on(7, 15))).toBe('summer');
    expect(seasonFor(on(10, 14))).toBe('autumn');
    expect(seasonFor(on(11, 5))).toBe('autumn');
    expect(seasonFor(on(3, 17))).toBe('st-patricks');
    expect(seasonFor(on(6, 28))).toBe('pride');
    expect(seasonFor(on(7, 1))).toBe('summer');
  });

  it('finds Easter and Lunar New Year, which move every year', () => {
    expect(easter(2026)).toEqual([4, 5]);
    expect(easter(2027)).toEqual([3, 28]);
    expect(easter(2030)).toEqual([4, 21]);
    expect(seasonFor(on(4, 1))).toBe('easter');
    expect(seasonFor(on(4, 6))).toBe('easter');
    expect(seasonFor(on(4, 7))).toBe('spring');
    expect(seasonFor(on(2, 17))).toBe('lunar-new-year');
    expect(seasonFor(on(2, 16))).toBe('lunar-new-year');
    expect(seasonFor(on(1, 27, 2028))).toBe('lunar-new-year');
    expect(seasonFor(on(2, 25))).toBe('winter');
  });

  it('has a season for every day of the year', () => {
    for (let t = on(1, 1); t < on(1, 1, 2027); t += 24 * 60 * 60_000) expect(seasonFor(t)).not.toBeNull();
  });

  it('never suggests a style', () => {
    for (let t = on(1, 1); t < on(1, 1, 2027); t += 24 * 60 * 60_000) {
      const id = seasonFor(t)!;
      expect(APP_ICONS.find((i) => i.id === id)?.kind).toBe('season');
    }
  });

  it('offers the season that is on, once a year, and not when it is already on', () => {
    const now = on(10, 20);
    expect(iconToSuggest(now, 'default', [], true)).toEqual({ id: 'halloween', inDays: 0, key: 'halloween-2026' });
    expect(iconToSuggest(now, 'halloween', [], true)).toBeNull();
    expect(iconToSuggest(now, 'default', ['halloween-2025'], true)?.id).toBe('halloween');
    expect(iconToSuggest(now, 'default', [], false)).toBeNull();
  });

  it('once closed, stays away until a week before the next one', () => {
    const seen = ['halloween-2026'];
    expect(iconToSuggest(on(10, 22), 'default', seen, true)).toBeNull();
    // Halloween ends on the 31st and autumn carries on: the next new one is Christmas, on 1 December.
    expect(iconToSuggest(on(11, 23), 'default', [...seen, 'autumn-2026'], true)).toBeNull();
    expect(iconToSuggest(on(11, 24), 'default', [...seen, 'autumn-2026'], true)).toEqual({ id: 'christmas', inDays: 7, key: 'christmas-2026' });
    expect(iconToSuggest(on(11, 30), 'default', [...seen, 'autumn-2026'], true)?.inDays).toBe(1);
    // New Year's January days count with the year it started.
    expect(iconToSuggest(on(12, 26), 'default', ['christmas-2026'], true)).toEqual({ id: 'new-year', inDays: 5, key: 'new-year-2026' });
    expect(iconToSuggest(on(1, 3, 2027), 'default', ['new-year-2026'], true)).toEqual({ id: 'winter', inDays: 5, key: 'winter-2027' });
  });

  it('counts the January days of New Year with the year it started', () => {
    expect(seasonKey('new-year', on(1, 2, 2027))).toBe('new-year-2026');
    expect(seasonKey('new-year', on(12, 31, 2026))).toBe('new-year-2026');
  });

  it('has one native icon per season and style, plus the everyday one', () => {
    expect(APP_ICONS.filter((i) => i.native === null)).toHaveLength(1);
    expect(new Set(APP_ICONS.map((i) => i.native)).size).toBe(APP_ICONS.length);
  });
});
