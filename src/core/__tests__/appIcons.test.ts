import { APP_ICONS, iconToSuggest, seasonFor, seasonKey } from '../appIcons';

const on = (m: number, d: number, y = 2026) => new Date(y, m - 1, d, 12).getTime();

describe('seasonal icons', () => {
  it('knows the holidays and seasons', () => {
    expect(seasonFor(on(10, 31))).toBe('halloween');
    expect(seasonFor(on(10, 14))).toBeNull();
    expect(seasonFor(on(12, 24))).toBe('christmas');
    expect(seasonFor(on(12, 31))).toBe('new-year');
    expect(seasonFor(on(1, 3))).toBe('new-year');
    expect(seasonFor(on(2, 14))).toBe('valentines');
    expect(seasonFor(on(2, 20))).toBe('winter');
    expect(seasonFor(on(4, 10))).toBe('spring');
    expect(seasonFor(on(7, 15))).toBe('summer');
    expect(seasonFor(on(11, 5))).toBeNull();
  });

  it('suggests a season once a year, and not when it is already on', () => {
    const now = on(10, 20);
    expect(iconToSuggest(now, 'default', [], true)).toBe('halloween');
    expect(iconToSuggest(now, 'halloween', [], true)).toBeNull();
    expect(iconToSuggest(now, 'default', [seasonKey('halloween', now)], true)).toBeNull();
    expect(iconToSuggest(now, 'default', ['halloween-2025'], true)).toBe('halloween');
    expect(iconToSuggest(now, 'default', [], false)).toBeNull();
  });

  it('counts the January days of New Year with the year it started', () => {
    expect(seasonKey('new-year', on(1, 2, 2027))).toBe('new-year-2026');
    expect(seasonKey('new-year', on(12, 31, 2026))).toBe('new-year-2026');
  });

  it('has one native icon per season, plus the everyday one', () => {
    expect(APP_ICONS.filter((i) => i.native === null)).toHaveLength(1);
    expect(new Set(APP_ICONS.map((i) => i.native)).size).toBe(APP_ICONS.length);
  });
});
