import { altitudeFromPressure, balanceTimer, floorCounter, lungeCounter, punchCounter, seeded, type MissionLevel } from '../missions';
import {
  COUNTDOWN_STEP,
  DSST_SYMBOLS,
  HUNT_ITEMS,
  PAIR_FACES,
  countdownStart,
  dsstKey,
  huntItems,
  huntPool,
  swapHuntItem,
  huntMatches,
  isNBackMatch,
  nextNBack,
  pairsDeck,
  sequenceProblem,
  slideBoard,
  slideMove,
  slideSolved,
  sudokuClashes,
  sudokuPuzzle,
  sudokuSolved,
  tapCounter,
} from '../puzzles';
import { TRIVIA, triviaBag } from '../trivia';

const LEVELS: MissionLevel[] = [1, 2, 3];

describe('sliding puzzle', () => {
  it('is mixed up but always solvable, and bigger on Hard', () => {
    const random = seeded(3);
    for (const level of LEVELS) {
      for (let i = 0; i < 20; i++) {
        const { size, tiles } = slideBoard(level, random);
        expect(size).toBe(level === 3 ? 4 : 3);
        expect([...tiles].sort((a, b) => a - b)).toEqual(Array.from({ length: size * size }, (_, k) => k));
        expect(slideSolved(tiles)).toBe(false);
        // Solvable: for an odd width, an even number of inversions; for an even width, inversions + the gap's row from the bottom is odd.
        const flat = tiles.filter((t) => t !== 0);
        let inversions = 0;
        for (let a = 0; a < flat.length; a++) for (let b = a + 1; b < flat.length; b++) if (flat[a] > flat[b]) inversions++;
        const gapRowFromBottom = size - Math.floor(tiles.indexOf(0) / size);
        expect(size % 2 === 1 ? inversions % 2 === 0 : (inversions + gapRowFromBottom) % 2 === 1).toBe(true);
      }
    }
  });

  it('only slides tiles next to the gap', () => {
    const solved = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    expect(slideMove(solved, 3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(slideMove(solved, 3, 0)).toBeNull();
    expect(slideSolved(solved)).toBe(true);
  });
});

describe('pairs', () => {
  it('has every face exactly twice', () => {
    const random = seeded(5);
    for (const level of LEVELS) {
      const { columns, cards } = pairsDeck(level, random);
      expect(cards.length).toBe([12, 16, 20][level - 1]);
      expect(cards.length % columns).toBe(0);
      const counts = new Map<number, number>();
      for (const c of cards) counts.set(c, (counts.get(c) ?? 0) + 1);
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
      expect(Math.max(...cards)).toBeLessThan(PAIR_FACES.length);
    }
  });
});

describe('what comes next', () => {
  it('offers four different choices, one of them right', () => {
    const random = seeded(8);
    for (const level of LEVELS) {
      for (let i = 0; i < 200; i++) {
        const p = sequenceProblem(level, random);
        expect(p.options).toHaveLength(4);
        expect(new Set(p.options).size).toBe(4);
        expect(p.options.filter((o) => o === p.answer)).toHaveLength(1);
        expect(p.terms.length).toBeGreaterThanOrEqual(4);
        expect(p.terms.every(Number.isInteger)).toBe(true);
      }
    }
  });

  it('follows its rule', () => {
    const random = seeded(2);
    for (let i = 0; i < 50; i++) {
      const p = sequenceProblem(1, random);
      const d = p.terms[1] - p.terms[0];
      const r = p.terms[1] / p.terms[0];
      expect(p.answer === p.terms[p.terms.length - 1] + d || p.answer === p.terms[p.terms.length - 1] * r).toBe(true);
    }
  });
});

describe('mini sudoku', () => {
  it('starts from a correct grid with the right number of blanks', () => {
    const random = seeded(11);
    for (const level of LEVELS) {
      for (let i = 0; i < 30; i++) {
        const s = sudokuPuzzle(level, random);
        expect(s.size).toBe(level === 3 ? 6 : 4);
        expect(s.puzzle.filter((d) => d === 0)).toHaveLength([6, 10, 18][level - 1]);
        expect(sudokuClashes(s.puzzle, s).size).toBe(0);
      }
    }
  });

  it('can always be finished, and checks rows, columns and boxes', () => {
    const random = seeded(4);
    const s = sudokuPuzzle(3, random);
    // Solve it by brute force to prove a solution exists.
    const grid = [...s.puzzle];
    const fits = (i: number, d: number) => {
      grid[i] = d;
      const ok = !sudokuClashes(grid, s).has(i);
      grid[i] = 0;
      return ok;
    };
    const solve = (i: number): boolean => {
      if (i === grid.length) return true;
      if (grid[i]) return solve(i + 1);
      for (let d = 1; d <= s.size; d++) {
        if (!fits(i, d)) continue;
        grid[i] = d;
        if (solve(i + 1)) return true;
        grid[i] = 0;
      }
      return false;
    };
    expect(solve(0)).toBe(true);
    expect(sudokuSolved(grid, s)).toBe(true);
    const broken = [...grid];
    [broken[0], broken[1]] = [broken[1], broken[0]];
    expect(sudokuSolved(broken, s)).toBe(false);
    expect(sudokuSolved([...grid.slice(0, -1), 0], s)).toBe(false);
  });
});

describe('trivia', () => {
  it('has four different answers per question and no repeats in a mission', () => {
    for (const t of TRIVIA) expect(new Set(t.a).size).toBe(4);
    expect(new Set(TRIVIA.map((t) => t.q)).size).toBe(TRIVIA.length);
    const next = triviaBag(seeded(1));
    const seen = new Set(Array.from({ length: TRIVIA.length }, () => next().q));
    expect(seen.size).toBe(TRIVIA.length);
  });
});

describe('object hunt', () => {
  it('matches what the labeller says, above a confidence', () => {
    const cup = HUNT_ITEMS.find((i) => i.name.includes('cup'))!;
    expect(huntMatches(cup, [{ text: 'Cup', confidence: 0.8 }])).toBe(true);
    expect(huntMatches(cup, [{ text: 'cup', confidence: 0.8 }])).toBe(true);
    expect(huntMatches(cup, [{ text: 'Cup', confidence: 0.3 }])).toBe(false);
    expect(huntMatches(cup, [{ text: 'Shoe', confidence: 0.9 }])).toBe(false);
    const items = huntItems(3, seeded(2));
    expect(new Set(items.map((i) => i.name)).size).toBe(3);
  });
});

describe('countdown, 2-back, symbol code, tapping', () => {
  it('starts high enough to count down', () => {
    const random = seeded(6);
    for (const level of LEVELS) for (let i = 0; i < 50; i++) expect(countdownStart(level, random)).toBeGreaterThan(COUNTDOWN_STEP[level] * 4);
  });

  it('makes 2-back matches about a third of the time, and knows one when it sees it', () => {
    const random = seeded(9);
    const history: string[] = [];
    let matches = 0;
    for (let i = 0; i < 600; i++) {
      history.push(nextNBack(history, random));
      if (isNBackMatch(history)) matches++;
    }
    expect(matches / 600).toBeGreaterThan(0.25);
    expect(matches / 600).toBeLessThan(0.45);
    expect(isNBackMatch(['K', 'B', 'K'])).toBe(true);
    expect(isNBackMatch(['K', 'K', 'B'])).toBe(false);
  });

  it('gives every symbol its own digit', () => {
    const key = dsstKey(seeded(1));
    expect(new Set(DSST_SYMBOLS.map((s) => key[s])).size).toBe(9);
  });

  it('only counts taps that alternate sides', () => {
    const tap = tapCounter();
    expect(['left', 'right', 'right', 'left', 'left'].map((s) => tap(s as 'left' | 'right'))).toEqual([true, true, false, true, false]);
  });
});

describe('body counters', () => {
  it('turns pressure into height: about 8 m per hPa near sea level', () => {
    expect(altitudeFromPressure(1013.25)).toBeCloseTo(0, 5);
    expect(altitudeFromPressure(1012.25)).toBeGreaterThan(7.5);
    expect(altitudeFromPressure(1012.25)).toBeLessThan(9);
  });

  it('counts a floor up or down, and ignores small jitter', () => {
    const count = floorCounter();
    let floors = 0;
    // Jitter of ±0.05 hPa (about ±40 cm) for a while: nothing.
    for (let i = 0; i < 50; i++) floors += count(1013 + (i % 2 ? 0.05 : -0.05)).floors;
    expect(floors).toBe(0);
    // Climb a floor (about 3.3 m): pressure drops about 0.4 hPa.
    for (let i = 0; i < 40; i++) floors += count(1013 - 0.4).floors;
    expect(floors).toBe(1);
    // And back down.
    for (let i = 0; i < 40; i++) floors += count(1013).floors;
    expect(floors).toBe(2);
  });

  it('counts lunges and punches', () => {
    const lunge = lungeCounter();
    const samples = [1, 0.8, 0.8, 0.8, 1.2, 1.2, 1.2, 1];
    expect(samples.filter((g, i) => lunge({ x: 0, y: g, z: 0, t: i * 50 })).length).toBe(1);
    const punch = punchCounter();
    expect([1, 2.6, 1, 2.6, 1].filter((g, i) => punch({ x: g, y: 0, z: 0, t: i * 300 })).length).toBe(2);
  });

  it('runs the balance clock while upright and steady, and resets on a wobble', () => {
    const hold = balanceTimer(2);
    let ms = 0;
    for (let i = 0; i <= 50; i++) ms = hold({ x: 0, y: -1, z: 0.05, t: i * 100 }).ms;
    expect(ms).toBe(5000);
    expect(hold({ x: 0, y: -1.6, z: 0, t: 5100 }).ms).toBe(0);
    // Lying flat isn't upright.
    const flat = balanceTimer(1);
    for (let i = 0; i <= 20; i++) ms = flat({ x: 0, y: 0, z: 1, t: i * 100 }).ms;
    expect(ms).toBe(0);
  });
});

describe('2-back letters', () => {
  it('never shows the same letter twice in a row', () => {
    const random = seeded(12);
    const h: string[] = [];
    for (let i = 0; i < 300; i++) {
      h.push(nextNBack(h, random));
      if (i > 0) expect(h[i]).not.toBe(h[i - 1]);
    }
  });
});

describe('object hunt choices', () => {
  it('only asks for the objects picked, and all of them when none were', () => {
    expect(huntPool(['cup', 'shoe']).map((i) => i.id)).toEqual(['cup', 'shoe']);
    expect(huntPool([])).toHaveLength(HUNT_ITEMS.length);
    expect(huntPool(['gone'])).toHaveLength(HUNT_ITEMS.length);
    const items = huntItems(5, seeded(3), ['cup', 'shoe']);
    expect(items.every((i) => i.id === 'cup' || i.id === 'shoe')).toBe(true);
    for (let i = 1; i < items.length; i++) expect(items[i].id).not.toBe(items[i - 1].id);
  });

  it('swaps for something else on the list', () => {
    const cup = HUNT_ITEMS.find((i) => i.id === 'cup')!;
    expect(swapHuntItem(cup, seeded(1), ['cup', 'plant']).id).toBe('plant');
    expect(swapHuntItem(cup, seeded(1), ['cup']).id).toBe('cup');
    expect(new Set(HUNT_ITEMS.map((i) => i.id)).size).toBe(HUNT_ITEMS.length);
  });
});
