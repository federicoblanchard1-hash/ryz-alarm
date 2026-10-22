// Seasonal app icons. The rz mark never changes; each season only changes
// the tile colour and adds one small accessory. The dates follow the
// northern-hemisphere seasons and the usual holiday weeks.

export type AppIconId = 'default' | 'halloween' | 'christmas' | 'new-year' | 'valentines' | 'spring' | 'summer' | 'winter';

export interface AppIcon {
  id: AppIconId;
  title: string;
  /** The name the native module knows it by (app.json); null is the everyday icon. */
  native: string | null;
  /** The tile colour, for the picker. */
  tile: string;
}

export const APP_ICONS: AppIcon[] = [
  { id: 'default', title: 'Everyday', native: null, tile: '#000000' },
  { id: 'halloween', title: 'Halloween', native: 'Halloween', tile: '#FF7A00' },
  { id: 'christmas', title: 'Christmas', native: 'Christmas', tile: '#14532D' },
  { id: 'new-year', title: 'New Year', native: 'NewYear', tile: '#000000' },
  { id: 'valentines', title: "Valentine's", native: 'Valentines', tile: '#E63950' },
  { id: 'spring', title: 'Spring', native: 'Spring', tile: '#F3EFE4' },
  { id: 'summer', title: 'Summer', native: 'Summer', tile: '#FFC23C' },
  { id: 'winter', title: 'Winter', native: 'Winter', tile: '#0E1F3B' },
];

export const APP_ICON = Object.fromEntries(APP_ICONS.map((i) => [i.id, i])) as Record<AppIconId, AppIcon>;

/** [season, first day, last day] as month-day numbers (1015 = 15 October). Holidays win over seasons. */
const WINDOWS: [AppIconId, number, number][] = [
  ['halloween', 1015, 1031],
  ['christmas', 1201, 1230],
  ['new-year', 1231, 1231],
  ['new-year', 101, 107],
  ['valentines', 207, 214],
  ['winter', 108, 319],
  ['spring', 320, 620],
  ['summer', 621, 922],
];

/** The season (or holiday) a date falls in, or null in the weeks that have none (most of autumn). */
export function seasonFor(ms: number): AppIconId | null {
  const d = new Date(ms);
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  return WINDOWS.find(([, from, to]) => md >= from && md <= to)?.[0] ?? null;
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
