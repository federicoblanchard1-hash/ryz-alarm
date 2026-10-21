import {
  MISSIONS,
  MISSION_GROUPS,
  SIGNS,
  arrowTrial,
  clampAmount,
  makePattern,
  makeSum,
  noRepeats,
  SENTENCES,
  WORDS,
  wordBag,
  memoryGrid,
  missionsIn,
  numberBoard,
  oddTile,
  pickSentences,
  pickWord,
  pvtCounts,
  pvtDelay,
  sameWords,
  scramble,
  seeded,
  LIGHT_LUX,
  lightTimer,
  reachCounter,
  shakeCounter,
  sprintTimer,
  squatCounter,
  twistCounter,
  symbolProblem,
  type Sample,
} from '../missions';

describe('makeSum', () => {
  it('gets harder with the level and always has the right answer', () => {
    const random = seeded(1);
    for (const level of [1, 2, 3] as const) {
      for (let i = 0; i < 50; i++) {
        const { text, answer } = makeSum(level, random);
        const value = Function(`return ${text.replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/')}`)();
        expect(value).toBe(answer);
      }
    }
    expect(makeSum(1, seeded(2)).answer).toBeLessThan(70);
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

describe('new body missions', () => {
  it('runs the sprint clock only while moving hard', () => {
    const run = sprintTimer();
    let ms = 0;
    // 3 s of hard running (big jolts every 200 ms), then 3 s standing still.
    for (let t = 0; t <= 3000; t += 40) ms = run({ x: 0, y: 0, z: t % 200 < 80 ? 2 : 0.3, t });
    expect(ms).toBeGreaterThan(2800);
    const afterRun = ms;
    for (let t = 3040; t <= 6000; t += 40) ms = run(still(t));
    expect(ms - afterRun).toBeLessThan(450);
  });

  it('counts a twist each time the turn changes direction', () => {
    const twist = twistCounter();
    const turn = (dir: number, start: number) => [0.5, 2.5, 3, 2.5, 0.5].map((v, i) => ({ x: 0, y: dir * v, z: 0.1, t: start + i * 40 }));
    const samples = [...turn(1, 0), ...turn(-1, 400), ...turn(1, 800), ...turn(1, 1200)];
    // Left, right, left: the fourth turn in the same direction doesn't count again.
    expect(samples.filter(twist)).toHaveLength(3);
  });

  it('counts one reach per up-and-down', () => {
    const reach = reachCounter();
    const move = (start: number, first: number, second: number) => [1, first, first, first, 1, second, second, second, 1].map((z, i) => ({ x: 0, y: 0, z, t: start + i * 60 }));
    const samples = [...move(0, 1.7, 0.4), ...move(600, 0.4, 1.7), ...move(1200, 1.7, 0.4), ...move(1800, 0.4, 1.7)];
    expect(samples.filter(reach)).toHaveLength(2);
  });

  it('times bright light by level', () => {
    const lit = lightTimer(2);
    let ms = 0;
    for (let t = 0; t <= 5000; t += 250) ms = lit(t < 2000 ? 50 : LIGHT_LUX[2] + 100, t);
    expect(ms).toBeGreaterThanOrEqual(2750);
    expect(ms).toBeLessThanOrEqual(3250);
  });
});

describe('catalog', () => {
  it('puts every mission in exactly one group', () => {
    const listed = MISSION_GROUPS.flatMap((g) => missionsIn(g.id));
    expect(listed.sort()).toEqual(Object.keys(MISSIONS).sort());
  });

  it('keeps custom amounts inside the limits and on the step', () => {
    expect(clampAmount('squats', 0)).toBe(MISSIONS.squats.min);
    expect(clampAmount('squats', 10_000)).toBe(MISSIONS.squats.max);
    expect(clampAmount('steps', 37.4)).toBe(37);
    for (const info of Object.values(MISSIONS)) expect(info.max).toBeLessThanOrEqual(100);
  });
});

describe('brain generators', () => {
  it('number hunt holds 1…n² once each', () => {
    const { size, numbers } = numberBoard(2, seeded(3));
    expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: size * size }, (_, i) => i + 1));
  });

  it('odd tile sits on the board and differs from the rest', () => {
    for (let round = 0; round < 20; round++) {
      const t = oddTile(3, round, seeded(round + 1));
      expect(t.odd).toBeLessThan(t.size * t.size);
      expect(Math.abs(t.other - t.base)).toBeGreaterThan(0.03);
    }
  });

  it('missing symbol has exactly one sign that fits', () => {
    const random = seeded(5);
    for (const level of [1, 2, 3] as const) {
      for (let i = 0; i < 100; i++) {
        const p = symbolProblem(level, random);
        const fits = SIGNS.filter((s) => {
          if (s === '+') return p.a + p.b === p.result;
          if (s === '−') return p.a - p.b === p.result;
          if (s === '×') return p.a * p.b === p.result;
          return p.a % p.b === 0 && p.a / p.b === p.result;
        });
        expect(fits).toEqual([p.sign]);
      }
    }
  });

  it('scrambles a word into the same letters in a new order', () => {
    const random = seeded(7);
    for (const level of [1, 2, 3] as const) {
      const word = pickWord(level, random);
      const mixed = scramble(word, random);
      expect(mixed).not.toBe(word);
      expect(mixed.split('').sort().join('')).toBe(word.split('').sort().join(''));
    }
  });

  it('reaction test ignores false starts and slow taps', () => {
    expect(pvtCounts(80, 1)).toBe(false);
    expect(pvtCounts(300, 3)).toBe(true);
    expect(pvtCounts(450, 3)).toBe(false);
    expect(pvtCounts(450, 1)).toBe(true);
    const d = pvtDelay(seeded(9));
    expect(d).toBeGreaterThanOrEqual(2000);
    expect(d).toBeLessThanOrEqual(7000);
  });

  it('arrow test shows more conflicting words on harder levels', () => {
    const conflicts = (level: 1 | 3) => {
      const random = seeded(11);
      let n = 0;
      for (let i = 0; i < 400; i++) {
        const t = arrowTrial(level, random);
        if (t.arrow !== t.word) n++;
      }
      return n;
    };
    expect(conflicts(3)).toBeGreaterThan(conflicts(1));
  });
});

describe('no repeats', () => {
  it('gives a different sum every time in a long mission', () => {
    for (const level of [1, 2, 3] as const) {
      const next = noRepeats(() => makeSum(level, Math.random), (s) => s.text);
      const texts = Array.from({ length: 100 }, () => next().text);
      expect(new Set(texts).size).toBe(100);
    }
  });

  it('uses every sentence before repeating, never twice in a row', () => {
    const picked = pickSentences(SENTENCES.length * 2 + 5, seeded(4));
    expect(new Set(picked.slice(0, SENTENCES.length)).size).toBe(SENTENCES.length);
    for (let i = 1; i < picked.length; i++) expect(picked[i]).not.toBe(picked[i - 1]);
  });

  it('draws words from a shuffled bag', () => {
    const next = wordBag(2, seeded(8));
    const words = Array.from({ length: WORDS[2].length }, next);
    expect(new Set(words).size).toBe(WORDS[2].length);
  });
});
