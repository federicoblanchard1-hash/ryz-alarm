import { makePattern, makeSum, memoryGrid, pickSentences, sameWords, seeded, shakeCounter, squatCounter, type Sample } from '../missions';

describe('makeSum', () => {
  it('gets harder with the level and always has the right answer', () => {
    const random = seeded(1);
    for (const level of [1, 2, 3] as const) {
      for (let i = 0; i < 50; i++) {
        const { text, answer } = makeSum(level, random);
        const value = Function(`return ${text.replace('×', '*')}`)();
        expect(value).toBe(answer);
      }
    }
    expect(makeSum(1, seeded(2)).answer).toBeLessThan(60);
    expect(makeSum(3, seeded(2)).text).toMatch(/× \d+ \+/);
  });
});

describe('memory', () => {
  it('picks distinct squares inside the grid, one more each round', () => {
    const { size, tiles } = memoryGrid(2);
    const round0 = makePattern(2, 0, seeded(3));
    const round2 = makePattern(2, 2, seeded(3));
    expect(new Set(round0).size).toBe(tiles);
    expect(round2).toHaveLength(tiles + 2);
    expect(Math.max(...round2)).toBeLessThan(size * size);
  });
});

describe('typing', () => {
  it('ignores case, punctuation and extra spaces', () => {
    expect(sameWords('  i am AWAKE, and ready for today! ', 'I am awake and ready for today')).toBe(true);
    expect(sameWords('I am awake', 'I am awake and ready for today')).toBe(false);
  });

  it('never repeats a sentence', () => {
    const picked = pickSentences(3, seeded(4));
    expect(new Set(picked).size).toBe(3);
  });
});

const still = (t: number): Sample => ({ x: 0, y: 0, z: 1, t });

describe('shakeCounter', () => {
  it('counts jolts but not one long jolt twice', () => {
    const count = shakeCounter();
    const samples = [still(0), { x: 2, y: 0, z: 1, t: 100 }, { x: 2.2, y: 0, z: 1, t: 150 }, still(300), { x: -2, y: 1, z: 1, t: 400 }];
    expect(samples.filter(count)).toHaveLength(2);
  });
});

describe('squatCounter', () => {
  it('counts one squat per dip then peak, and ignores standing still', () => {
    const count = squatCounter();
    const squat = (start: number): Sample[] =>
      [1, 0.7, 0.6, 0.7, 1, 1.3, 1.4, 1.3, 1, 0.9, 1].map((z, i) => ({ x: 0, y: 0, z, t: start + i * 80 }));
    const samples = [...Array.from({ length: 20 }, (_, i) => still(i * 50)), ...squat(1000), ...squat(2500), ...squat(4000)];
    expect(samples.filter(count)).toHaveLength(3);
  });
});
