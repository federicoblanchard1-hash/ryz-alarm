// Seasonal app icons. The rz mark never changes; each season only changes
// the tile colour and adds one small accessory. The dates follow the
// northern-hemisphere seasons and the usual holiday weeks. Styles (Light,
// Gold, Sunrise) have no dates: they're just there to pick.

export type AppIconId =
  | 'default'
  | 'light'
  | 'gold'
  | 'sunrise'
  | 'halloween'
  | 'christmas'
  | 'new-year'
  | 'lunar-new-year'
  | 'valentines'
  | 'st-patricks'
  | 'easter'
  | 'pride'
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter';

export interface AppIcon {
  id: AppIconId;
  title: string;
  /** The name the native module knows it by (app.json); null is the everyday icon. */
  native: string | null;
  /** The tile colour, for the picker. */
  tile: string;
  /** A season or holiday (suggested when it comes round), or a style to use any time. */
  kind: 'season' | 'style';
}

export const APP_ICONS: AppIcon[] = [
  { id: 'default', title: 'Everyday', native: null, tile: '#000000', kind: 'style' },
  { id: 'light', title: 'Light', native: 'Light', tile: '#F4F3EF', kind: 'style' },
  { id: 'gold', title: 'Gold', native: 'Gold', tile: '#000000', kind: 'style' },
  { id: 'sunrise', title: 'Sunrise', native: 'Sunrise', tile: '#D9507A', kind: 'style' },
  { id: 'winter', title: 'Winter', native: 'Winter', tile: '#0E1F3B', kind: 'season' },
  { id: 'spring', title: 'Spring', native: 'Spring', tile: '#F3EFE4', kind: 'season' },
  { id: 'summer', title: 'Summer', native: 'Summer', tile: '#FFC23C', kind: 'season' },
  { id: 'autumn', title: 'Autumn', native: 'Autumn', tile: '#9A3412', kind: 'season' },
  { id: 'new-year', title: 'New Year', native: 'NewYear', tile: '#000000', kind: 'season' },
  { id: 'lunar-new-year', title: 'Lunar New Year', native: 'LunarNewYear', tile: '#B91C1C', kind: 'season' },
  { id: 'valentines', title: "Valentine's", native: 'Valentines', tile: '#E63950', kind: 'season' },
  { id: 'st-patricks', title: "St Patrick's", native: 'StPatricks', tile: '#15803D', kind: 'season' },
  { id: 'easter', title: 'Easter', native: 'Easter', tile: '#CFE8F3', kind: 'season' },
  { id: 'pride', title: 'Pride', native: 'Pride', tile: '#000000', kind: 'season' },
  { id: 'halloween', title: 'Halloween', native: 'Halloween', tile: '#FF7A00', kind: 'season' },
  { id: 'christmas', title: 'Christmas', native: 'Christmas', tile: '#14532D', kind: 'season' },
];

export const APP_ICON = Object.fromEntries(APP_ICONS.map((i) => [i.id, i])) as Record<AppIconId, AppIcon>;

type Window = [AppIconId, number, number];

/** [icon, first day, last day] as month-day numbers (1015 = 15 October). */
const HOLIDAYS: Window[] = [
  ['halloween', 1015, 1031],
  ['christmas', 1201, 1230],
  ['new-year', 1231, 1231],
  ['new-year', 101, 107],
  ['valentines', 207, 214],
  ['st-patricks', 314, 317],
  ['pride', 601, 630],
];
const SEASONS: Window[] = [
  ['winter', 108, 319],
  ['spring', 320, 620],
  ['summer', 621, 922],
  ['autumn', 923, 1130],
];

/** Lunar New Year's day (month, day) — it follows the moon, so it's looked up. */
const LUNAR_NEW_YEAR: Record<number, [number, number]> = {
  2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3],
  2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8], 2036: [1, 28],
};

/** Easter Sunday (month, day) in the Gregorian calendar (the "anonymous" algorithm). */
export function easter(year: number): [number, number] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return [Math.floor(n / 31), (n % 31) + 1];
}

const md = (d: Date) => (d.getMonth() + 1) * 100 + d.getDate();
/** A window from `before` days before a date to `after` days after it, in the same year. */
function around(id: AppIconId, year: number, [month, day]: [number, number], before: number, after: number): Window {
  return [id, md(new Date(year, month - 1, day - before)), md(new Date(year, month - 1, day + after))];
}

/** The season (or holiday) a date falls in. Holidays win over seasons. */
export function seasonFor(ms: number): AppIconId | null {
  const d = new Date(ms);
  const year = d.getFullYear();
  const lunar = LUNAR_NEW_YEAR[year];
  // Easter week: Palm Sunday to Easter Monday. Lunar New Year: the eve and the first week.
  const moving: Window[] = [around('easter', year, easter(year), 7, 1), ...(lunar ? [around('lunar-new-year', year, lunar, 1, 7)] : [])];
  const today = md(d);
  return [...HOLIDAYS, ...moving, ...SEASONS].find(([, from, to]) => today >= from && today <= to)?.[0] ?? null;
}

/** A key for "this season, this year", so a dismissed suggestion stays dismissed until next year. */
export function seasonKey(id: AppIconId, ms: number): string {
  const d = new Date(ms);
  // New Year straddles two years: the days in January belong to the one that started on 31 December.
  const year = id === 'new-year' && d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  return `${id}-${year}`;
}

/** Which season's icon to suggest now, if any: in season, not already on, not dismissed this year. */
export function iconToSuggest(now: number, current: AppIconId, seen: string[], enabled: boolean): AppIconId | null {
  if (!enabled) return null;
  const season = seasonFor(now);
  if (!season || season === current || seen.includes(seasonKey(season, now))) return null;
  return season;
}
