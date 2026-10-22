import { between, shuffleBag, type MissionLevel, type Random } from './missions';

// Generators for the newer brain and science missions. Everything takes a
// random source so the tests can replay it.

function shuffle<T>(items: T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- Sliding puzzle: tiles 1…n² − 1 and a gap (0), shuffled by real moves so it can always be solved.

export interface SlideBoard {
  size: number;
  tiles: number[];
}

/** Easy: 3×3, lightly mixed. Medium: 3×3, well mixed. Hard: 4×4. */
export function slideBoard(level: MissionLevel, random: Random = Math.random): SlideBoard {
  const size = level === 3 ? 4 : 3;
  const moves = [14, 40, 70][level - 1];
  let tiles = [...Array.from({ length: size * size - 1 }, (_, i) => i + 1), 0];
  let previous = -1;
  for (let i = 0; i < moves || slideSolved(tiles); i++) {
    const gap = tiles.indexOf(0);
    // Never slide the tile that just moved straight back.
    const options = neighbours(gap, size).filter((n) => n !== previous);
    const pick = options[Math.floor(random() * options.length)];
    tiles = slideMove(tiles, size, pick) ?? tiles;
    previous = gap;
  }
  return { size, tiles };
}

function neighbours(index: number, size: number): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const out: number[] = [];
  if (r > 0) out.push(index - size);
  if (r < size - 1) out.push(index + size);
  if (c > 0) out.push(index - 1);
  if (c < size - 1) out.push(index + 1);
  return out;
}

/** Slides the tile at `index` into the gap, if it's next to it; null otherwise. */
export function slideMove(tiles: number[], size: number, index: number): number[] | null {
  const gap = tiles.indexOf(0);
  if (!neighbours(gap, size).includes(index)) return null;
  const next = [...tiles];
  [next[gap], next[index]] = [next[index], next[gap]];
  return next;
}

export function slideSolved(tiles: number[]): boolean {
  return tiles.every((t, i) => (i === tiles.length - 1 ? t === 0 : t === i + 1));
}

// ---- Pairs: a shuffled deck of matching cards.

/** Card faces: black-and-white Ionicons, like the rest of Ryz. */
export const PAIR_FACES = ['sunny', 'moon', 'star', 'heart', 'leaf', 'flash', 'cloud', 'snow', 'water', 'flame', 'musical-note', 'paw'] as const;

/** Easy: 6 pairs (3×4). Medium: 8 pairs (4×4). Hard: 10 pairs (4×5). */
export function pairsDeck(level: MissionLevel, random: Random = Math.random): { columns: number; cards: number[] } {
  const pairs = [6, 8, 10][level - 1];
  const faces = shuffle(PAIR_FACES.map((_, i) => i), random).slice(0, pairs);
  return { columns: level === 1 ? 3 : 4, cards: shuffle([...faces, ...faces], random) };
}

// ---- What comes next: a number pattern, with four choices.

export interface SequenceProblem {
  terms: number[];
  answer: number;
  options: number[];
  /** What the rule was, shown after a wrong answer. */
  rule: string;
}

type Rule = (r: Random) => { terms: number[]; answer: number; rule: string };

const take = (count: number, f: (i: number) => number) => Array.from({ length: count + 1 }, (_, i) => f(i));
function split(all: number[], rule: string) {
  return { terms: all.slice(0, -1), answer: all[all.length - 1], rule };
}

const RULES: Record<MissionLevel, Rule[]> = {
  1: [
    (r) => {
      const a = between(r, 1, 20);
      const d = between(r, 2, 9);
      return split(take(4, (i) => a + d * i), `Add ${d} each time`);
    },
    (r) => {
      const d = between(r, 2, 6);
      const a = between(r, 4 * d + 5, 60);
      return split(take(4, (i) => a - d * i), `Take away ${d} each time`);
    },
    (r) => {
      const a = between(r, 1, 5);
      return split(take(4, (i) => a * 2 ** i), 'Double each time');
    },
  ],
  2: [
    (r) => {
      const a = between(r, 1, 4);
      const k = between(r, 3, 4);
      return split(take(4, (i) => a * k ** i), `Times ${k} each time`);
    },
    (r) => {
      const a = between(r, 1, 10);
      const d = between(r, 1, 3);
      // The step grows: +d, +2d, +3d…
      return split(take(4, (i) => a + (d * i * (i + 1)) / 2), `Add ${d}, then ${2 * d}, then ${3 * d}…`);
    },
    (r) => {
      const a = between(r, 2, 6);
      return split(take(4, (i) => (a + i) ** 2), 'Square numbers');
    },
    (r) => {
      const up = between(r, 4, 9);
      const down = between(r, 1, up - 1);
      const a = between(r, 5, 20);
      return split(take(5, (i) => a + Math.ceil(i / 2) * up - Math.floor(i / 2) * down), `Add ${up}, take away ${down}`);
    },
  ],
  3: [
    (r) => {
      const a = between(r, 1, 5);
      const b = between(r, 1, 6);
      const out = [a, b];
      while (out.length < 7) out.push(out[out.length - 1] + out[out.length - 2]);
      return split(out, 'Add the two before');
    },
    (r) => {
      const a = between(r, 1, 6);
      const k = between(r, 2, 3);
      const d = between(r, 1, 4);
      const out = [a];
      while (out.length < 6) out.push(out[out.length - 1] * k + d);
      return split(out, `Times ${k}, then add ${d}`);
    },
    (r) => {
      const a = between(r, 1, 3);
      return split(take(4, (i) => (a + i) ** 3), 'Cube numbers');
    },
    (r) => {
      const a = between(r, 2, 9);
      const d = between(r, 2, 5);
      // Two patterns woven together: a, x, a+d, x−1…
      const x = between(r, 30, 60);
      return split(take(6, (i) => (i % 2 === 0 ? a + (i / 2) * d : x - (i - 1) / 2)), `Two patterns in turn: +${d} and −1`);
    },
  ],
};

export function sequenceProblem(level: MissionLevel, random: Random = Math.random): SequenceProblem {
  const rules = RULES[level];
  const { terms, answer, rule } = rules[Math.floor(random() * rules.length)](random);
  // Wrong choices close to the right one, so a guess from the last step is tempting.
  const step = Math.max(1, Math.abs(answer - terms[terms.length - 1]));
  const near = [answer + 1, answer - 1, answer + 2, answer - 2, answer + step, answer - step, terms[terms.length - 1] + 1, answer + 10, answer - 10];
  const wrong = shuffle([...new Set(near.filter((n) => n !== answer && n >= 0))], random).slice(0, 3);
  return { terms, answer, rule, options: shuffle([answer, ...wrong], random) };
}

// ---- Mini sudoku: 4×4 (2×2 boxes) or 6×6 (2×3 boxes).

export interface Sudoku {
  size: number;
  boxRows: number;
  boxColumns: number;
  /** The givens; 0 for an empty cell. Any correct grid is accepted, not just one solution. */
  puzzle: number[];
}

/** Easy: 4×4 with 6 blanks. Medium: 4×4 with 10. Hard: 6×6 with 18. */
export function sudokuPuzzle(level: MissionLevel, random: Random = Math.random): Sudoku {
  const [boxRows, boxColumns] = level === 3 ? [2, 3] : [2, 2];
  const size = boxRows * boxColumns;
  const blanks = [6, 10, 18][level - 1];
  // A valid grid from the standard pattern, then shuffled in ways that keep it valid.
  const digits = shuffle(Array.from({ length: size }, (_, i) => i + 1), random);
  const bands = shuffle(Array.from({ length: size / boxRows }, (_, i) => i), random);
  const stacks = shuffle(Array.from({ length: size / boxColumns }, (_, i) => i), random);
  const rows = bands.flatMap((b) => shuffle(Array.from({ length: boxRows }, (_, i) => b * boxRows + i), random));
  const columns = stacks.flatMap((s) => shuffle(Array.from({ length: boxColumns }, (_, i) => s * boxColumns + i), random));
  const pattern = (r: number, c: number) => (boxColumns * (r % boxRows) + Math.floor(r / boxRows) + c) % size;
  const solution = rows.flatMap((r) => columns.map((c) => digits[pattern(r, c)]));
  const hidden = new Set(shuffle(solution.map((_, i) => i), random).slice(0, blanks));
  return { size, boxRows, boxColumns, puzzle: solution.map((d, i) => (hidden.has(i) ? 0 : d)) };
}

/** Whether a full grid is correct: every row, column and box has each number once. */
export function sudokuSolved(grid: number[], { size, boxRows, boxColumns }: Pick<Sudoku, 'size' | 'boxRows' | 'boxColumns'>): boolean {
  if (grid.length !== size * size || grid.some((d) => d < 1 || d > size)) return false;
  const full = (cells: number[]) => new Set(cells).size === size;
  for (let i = 0; i < size; i++) {
    const row = grid.slice(i * size, i * size + size);
    const column = Array.from({ length: size }, (_, r) => grid[r * size + i]);
    const br = Math.floor(i / (size / boxColumns)) * boxRows;
    const bc = (i % (size / boxColumns)) * boxColumns;
    const box = Array.from({ length: size }, (_, k) => grid[(br + Math.floor(k / boxColumns)) * size + bc + (k % boxColumns)]);
    if (!full(row) || !full(column) || !full(box)) return false;
  }
  return true;
}

/** Cells that clash with another in their row, column or box, to show in red. */
export function sudokuClashes(grid: number[], { size, boxRows, boxColumns }: Pick<Sudoku, 'size' | 'boxRows' | 'boxColumns'>): Set<number> {
  const out = new Set<number>();
  const box = (i: number) => Math.floor(Math.floor(i / size) / boxRows) * 100 + Math.floor((i % size) / boxColumns);
  grid.forEach((d, i) => {
    if (!d) return;
    grid.forEach((e, j) => {
      if (i === j || e !== d) return;
      if (Math.floor(i / size) === Math.floor(j / size) || i % size === j % size || box(i) === box(j)) out.add(i);
    });
  });
  return out;
}

// ---- Countdown (descending subtraction).

export const COUNTDOWN_STEP: Record<MissionLevel, number> = { 1: 3, 2: 7, 3: 13 };

export function countdownStart(level: MissionLevel, random: Random = Math.random): number {
  return level === 1 ? between(random, 60, 150) : between(random, 200, 999);
}

// ---- 2-back: letters one at a time; a match is the same letter as two before.

export const NBACK_LETTERS = ['B', 'F', 'H', 'K', 'M', 'P', 'R', 'T'];
/** How long each letter stays, by level. */
export const NBACK_MS: Record<MissionLevel, number> = { 1: 3000, 2: 2200, 3: 1600 };

/** The next letter: about a third of the time a match, otherwise anything but a match. Never the same letter twice in a row, so each new one is visible. */
export function nextNBack(history: string[], random: Random = Math.random): string {
  const back = history.length >= 2 ? history[history.length - 2] : null;
  if (back && random() < 0.33) return back;
  const choices = NBACK_LETTERS.filter((l) => l !== back && l !== history[history.length - 1]);
  return choices[Math.floor(random() * choices.length)];
}

export function isNBackMatch(history: string[]): boolean {
  return history.length >= 3 && history[history.length - 1] === history[history.length - 3];
}

// ---- Symbol code (digit symbol substitution).

export const DSST_SYMBOLS = ['triangle', 'square', 'ellipse', 'star', 'heart', 'moon', 'cloud', 'flash', 'leaf'] as const;
export type DsstSymbol = (typeof DSST_SYMBOLS)[number];
/** Seconds to answer each symbol, by level. */
export const DSST_SECONDS: Record<MissionLevel, number> = { 1: 6, 2: 3.5, 3: 2.2 };

/** A fresh key for one mission: each symbol gets one of the digits 1–9. */
export function dsstKey(random: Random = Math.random): Record<DsstSymbol, number> {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  return Object.fromEntries(DSST_SYMBOLS.map((s, i) => [s, digits[i]])) as Record<DsstSymbol, number>;
}

// ---- Finger tapping: alternate two buttons for 10 seconds.

export const TAP_SECONDS = 10;
export const TAP_TARGET: Record<MissionLevel, number> = { 1: 40, 2: 55, 3: 70 };

/** Counts taps that alternate sides; tapping the same side twice doesn't count. */
export function tapCounter() {
  let last: 'left' | 'right' | null = null;
  return (side: 'left' | 'right'): boolean => {
    if (side === last) return false;
    last = side;
    return true;
  };
}

// ---- Sound reaction: a beep after a random wait.

/** A little more room than the light test: phones add some delay before a sound is actually heard. */
export const BEEP_LIMIT_MS: Record<MissionLevel, number> = { 1: 700, 2: 520, 3: 400 };

// ---- Object hunt.

export interface HuntItem {
  id: string;
  /** What Ryz asks for: "Find a cup or mug". */
  name: string;
  /** Short, for the picker in the editor. */
  label: string;
  /** What the on-device image labeller calls it (any of these counts). */
  labels: string[];
}

/** Things found in most homes outside the bedroom, named the way the labeller knows them. */
export const HUNT_ITEMS: HuntItem[] = [
  { id: 'cup', label: 'Cup or mug', name: 'a cup or mug', labels: ['Cup', 'Coffee', 'Cappuccino', 'Tableware'] },
  { id: 'shoe', label: 'Shoe', name: 'a shoe', labels: ['Shoe', 'Sneakers'] },
  { id: 'chair', label: 'Chair', name: 'a chair', labels: ['Chair'] },
  { id: 'sofa', label: 'Sofa', name: 'the sofa', labels: ['Couch', 'Loveseat'] },
  { id: 'plant', label: 'Plant', name: 'a plant', labels: ['Plant', 'Flowerpot', 'Flora', 'Flower'] },
  { id: 'sink', label: 'Sink', name: 'a sink', labels: ['Sink', 'Bathroom', 'Countertop'] },
  { id: 'clock', label: 'Clock', name: 'a clock', labels: ['Clock'] },
  { id: 'glasses', label: 'Glasses', name: 'glasses or sunglasses', labels: ['Glasses', 'Sunglasses', 'Goggles'] },
  { id: 'cutlery', label: 'Fork or spoon', name: 'a fork or spoon', labels: ['Cutlery', 'Tableware'] },
  { id: 'screen', label: 'TV or computer', name: 'a TV or computer', labels: ['Television', 'Computer', 'Screenshot', 'Web page'] },
  { id: 'bag', label: 'Bag', name: 'a bag', labels: ['Bag', 'Handbag'] },
  { id: 'fruit', label: 'Fruit', name: 'some fruit', labels: ['Fruit', 'Food', 'Vegetable'] },
  { id: 'bread', label: 'Bread', name: 'some bread', labels: ['Bread', 'Food'] },
  { id: 'hat', label: 'Hat or cap', name: 'a hat or cap', labels: ['Hat', 'Cap', 'Beanie'] },
  { id: 'toy', label: 'Toy', name: 'a toy', labels: ['Toy', 'Stuffed toy', 'Plush', 'Lego'] },
  { id: 'jeans', label: 'Jeans', name: 'your jeans', labels: ['Jeans', 'Denim'] },
  { id: 'kitchen', label: 'Kitchen', name: 'the kitchen', labels: ['Kitchen', 'Cookware and bakeware', 'Countertop'] },
  { id: 'shelf', label: 'Shelf or drawer', name: 'a shelf or drawer', labels: ['Shelf', 'Drawer', 'Cabinetry'] },
];

export function huntMatches(item: HuntItem, labels: { text: string; confidence: number }[], minConfidence = 0.5): boolean {
  return labels.some((l) => l.confidence >= minConfidence && item.labels.some((x) => x.toLowerCase() === l.text.toLowerCase()));
}

/** The objects a mission may ask for: the ones picked in the editor, or all of them if none were. */
export function huntPool(allowed?: string[]): HuntItem[] {
  const picked = HUNT_ITEMS.filter((i) => allowed?.includes(i.id));
  return picked.length ? picked : HUNT_ITEMS;
}

/** `count` objects from the pool, each once before any repeats (a short list repeats), never twice in a row. */
export function huntItems(count: number, random: Random = Math.random, allowed?: string[]): HuntItem[] {
  const next = shuffleBag(huntPool(allowed), random);
  return Array.from({ length: count }, next);
}

/** Another object from the pool, for "Something else" (the same one only if it's the only one). */
export function swapHuntItem(current: HuntItem, random: Random = Math.random, allowed?: string[]): HuntItem {
  const others = huntPool(allowed).filter((i) => i.id !== current.id);
  return others.length ? others[Math.floor(random() * others.length)] : current;
}
