import { SLEEP_NEEDS, goalFit, hoursRange, needFor, suggestedGoal } from '../sleepNeeds';

describe('sleep needs by age', () => {
  it('covers every age, youngest first, with ranges that make sense', () => {
    expect(SLEEP_NEEDS).toHaveLength(9);
    for (const n of SLEEP_NEEDS) {
      expect(n.recommended[0]).toBeLessThan(n.recommended[1]);
      for (const [from, to] of n.mayBe) {
        expect(from).toBeLessThanOrEqual(to);
        expect(to < n.recommended[0] || from > n.recommended[1]).toBe(true);
      }
    }
    // Older people need less than babies.
    expect(SLEEP_NEEDS[0].recommended[0]).toBeGreaterThan(SLEEP_NEEDS[8].recommended[1]);
  });

  it('suggests the middle of the range as a goal', () => {
    expect(suggestedGoal('teen')).toBe(9 * 60);
    expect(suggestedGoal('adult')).toBe(8 * 60);
    expect(suggestedGoal('older')).toBe(7.5 * 60);
  });

  it('says where a goal sits', () => {
    expect(goalFit(8 * 60, 'adult')).toBe('recommended');
    expect(goalFit(6.5 * 60, 'adult')).toBe('maybe');
    expect(goalFit(5 * 60, 'adult')).toBe('outside');
    expect(goalFit(7 * 60, 'teen')).toBe('maybe');
    expect(goalFit(6 * 60, 'teen')).toBe('outside');
    expect(goalFit(5.5 * 60, 'older')).toBe('maybe');
  });

  it('writes ranges simply', () => {
    expect(hoursRange(needFor('adult').recommended)).toBe('7–9 h');
    expect(hoursRange([14, 14])).toBe('14 h');
  });
});
