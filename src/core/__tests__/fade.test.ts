import { GENTLE_START_DB, fadeVolume } from '../fade';

describe('fadeVolume', () => {
  it('starts quiet and ends at full volume', () => {
    expect(fadeVolume(0, 60, GENTLE_START_DB)).toBeCloseTo(0.0316, 3);
    expect(fadeVolume(60, 60, GENTLE_START_DB)).toBe(1);
    expect(fadeVolume(600, 60, GENTLE_START_DB)).toBe(1);
  });

  it('is halfway in decibels at the midpoint', () => {
    expect(fadeVolume(30, 60, GENTLE_START_DB)).toBeCloseTo(Math.pow(10, -15 / 20), 5);
  });

  it('is full volume with no ramp', () => {
    expect(fadeVolume(0, 0, GENTLE_START_DB)).toBe(1);
  });
});
