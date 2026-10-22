import type { AgeGroup } from './types';

// How much sleep each age needs, from the National Sleep Foundation's expert
// panel (Hirshkowitz et al., Sleep Health, 2015). "Recommended" is the range
// for most people that age; "may be fine" is the band just outside it that
// suits some people; further out isn't recommended. The American Academy of
// Sleep Medicine's numbers (Paruthi et al., 2016; Watson et al., 2015), which
// the CDC uses, are close: 9–12 h at 6–12, 8–10 h at 13–17, 7 h or more for
// adults.

export interface SleepNeed {
  title: string;
  ages: string;
  /** Hours a day, including naps for the young ones. */
  recommended: [number, number];
  /** The "may be appropriate" hours either side, as [from, to] ranges. */
  mayBe: [number, number][];
  /** The profile's age group, for the ages Ryz is for. */
  group?: AgeGroup;
}

export const SLEEP_NEEDS: SleepNeed[] = [
  { title: 'Newborns', ages: '0–3 months', recommended: [14, 17], mayBe: [[11, 13], [18, 19]] },
  { title: 'Infants', ages: '4–11 months', recommended: [12, 15], mayBe: [[10, 11], [16, 18]] },
  { title: 'Toddlers', ages: '1–2 years', recommended: [11, 14], mayBe: [[9, 10], [15, 16]] },
  { title: 'Preschoolers', ages: '3–5 years', recommended: [10, 13], mayBe: [[8, 9], [14, 14]] },
  { title: 'Children', ages: '6–13 years', recommended: [9, 11], mayBe: [[7, 8], [12, 12]] },
  { title: 'Teens', ages: '14–17 years', recommended: [8, 10], mayBe: [[7, 7], [11, 11]], group: 'teen' },
  { title: 'Young adults', ages: '18–25 years', recommended: [7, 9], mayBe: [[6, 6], [10, 11]], group: 'young' },
  { title: 'Adults', ages: '26–64 years', recommended: [7, 9], mayBe: [[6, 6], [10, 10]], group: 'adult' },
  { title: 'Older adults', ages: '65 and over', recommended: [7, 8], mayBe: [[5, 6], [9, 9]], group: 'older' },
];

export function needFor(group: AgeGroup): SleepNeed {
  return SLEEP_NEEDS.find((n) => n.group === group)!;
}

/** "7–9 h", or "14 h" when a range is a single number. */
export function hoursRange([from, to]: [number, number]): string {
  return from === to ? `${from} h` : `${from}–${to} h`;
}

/** The middle of the recommended range, in minutes, rounded to 15: a sensible sleep goal. */
export function suggestedGoal(group: AgeGroup): number {
  const [from, to] = needFor(group).recommended;
  return Math.round(((from + to) / 2) * 4) * 15;
}

/** Where a goal sits for an age: inside the recommended range, in the "may be fine" band, or outside both. */
export function goalFit(goalMinutes: number, group: AgeGroup): 'recommended' | 'maybe' | 'outside' {
  const h = goalMinutes / 60;
  const need = needFor(group);
  if (h >= need.recommended[0] && h <= need.recommended[1]) return 'recommended';
  // The "may be fine" bands are whole hours; count anything up to the next hour as inside them.
  if (need.mayBe.some(([from, to]) => h >= from && h < to + 1)) return 'maybe';
  return 'outside';
}
