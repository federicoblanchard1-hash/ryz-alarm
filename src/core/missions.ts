export type MissionType =
  | 'math'
  | 'memory'
  | 'typing'
  | 'numbers'
  | 'oddtile'
  | 'symbol'
  | 'unscramble'
  | 'shake'
  | 'squats'
  | 'steps'
  | 'qr'
  | 'pvt'
  | 'arrows'
  | 'jacks';
export type MissionLevel = 1 | 2 | 3;
export type MissionGroup = 'brain' | 'body' | 'science';

/** One task to finish before the alarm turns off. */
export interface Mission {
  type: MissionType;
  /** How many: sums, rounds, sentences, shakes, squats, steps, reactions… */
  amount: number;
  /** Difficulty, for the missions that have one. */
  level: MissionLevel;
  /** QR/barcode: the code that has to be scanned. Empty means any code. */
  code?: string;
}

export interface MissionInfo {
  group: MissionGroup;
  title: string;
  description: string;
  /** Quick picks in the editor; any number from min to max can also be set. */
  amounts: number[];
  min: number;
  max: number;
  step: number;
  unit: (n: number) => string;
  hasLevels: boolean;
  /** Needs a sensor or the camera; swapped for sums on a phone without one. */
  sensor?: 'accelerometer' | 'pedometer' | 'camera';
  /** For the Scientific missions: where the idea comes from. */
  research?: string;
}

export const MAX_MISSIONS = 5;

const plural = (one: string, many: string) => (n: number) => `${n} ${n === 1 ? one : many}`;

export const MISSIONS: Record<MissionType, MissionInfo> = {
  math: { group: 'brain', title: 'Math', description: 'Solve a few sums', amounts: [3, 5, 10], min: 1, max: 50, step: 1, unit: plural('sum', 'sums'), hasLevels: true },
  memory: { group: 'brain', title: 'Memory', description: 'Repeat a pattern of squares', amounts: [2, 3, 5], min: 1, max: 15, step: 1, unit: plural('round', 'rounds'), hasLevels: true },
  typing: { group: 'brain', title: 'Typing', description: 'Type a sentence word for word', amounts: [1, 2, 3], min: 1, max: 10, step: 1, unit: plural('sentence', 'sentences'), hasLevels: false },
  numbers: { group: 'brain', title: 'Number hunt', description: 'Tap the numbers in order, as fast as you can', amounts: [1, 2, 3], min: 1, max: 10, step: 1, unit: plural('board', 'boards'), hasLevels: true },
  oddtile: { group: 'brain', title: 'Odd one out', description: 'Find the square that is a different grey', amounts: [5, 10, 15], min: 1, max: 40, step: 1, unit: plural('round', 'rounds'), hasLevels: true },
  symbol: { group: 'brain', title: 'Missing symbol', description: 'Pick the sign that makes the sum true', amounts: [3, 5, 10], min: 1, max: 40, step: 1, unit: plural('problem', 'problems'), hasLevels: true },
  unscramble: { group: 'brain', title: 'Unscramble', description: 'Put the letters back in order', amounts: [2, 3, 5], min: 1, max: 20, step: 1, unit: plural('word', 'words'), hasLevels: true },
  shake: { group: 'body', title: 'Shake', description: 'Shake your phone hard', amounts: [20, 40, 80], min: 5, max: 300, step: 5, unit: plural('shake', 'shakes'), hasLevels: false, sensor: 'accelerometer' },
  squats: { group: 'body', title: 'Squats', description: 'Hold the phone to your chest and squat', amounts: [5, 10, 20], min: 1, max: 100, step: 1, unit: plural('squat', 'squats'), hasLevels: false, sensor: 'accelerometer' },
  steps: { group: 'body', title: 'Steps', description: 'Get up and walk around', amounts: [20, 50, 100], min: 10, max: 1000, step: 10, unit: plural('step', 'steps'), hasLevels: false, sensor: 'pedometer' },
  qr: { group: 'body', title: 'QR / Barcode', description: 'Get up and scan a code in another room', amounts: [1], min: 1, max: 1, step: 1, unit: plural('scan', 'scans'), hasLevels: false, sensor: 'camera' },
  pvt: {
    group: 'science',
    title: 'Reaction test',
    description: 'Tap the moment the light appears',
    amounts: [5, 10, 20],
    min: 3,
    max: 50,
    step: 1,
    unit: plural('reaction', 'reactions'),
    hasLevels: true,
    research: 'The psychomotor vigilance task, the standard alertness test in sleep research (Dinges), also used on the International Space Station.',
  },
  arrows: {
    group: 'science',
    title: 'Arrow test',
    description: 'Tap where the arrow points, not what the word says',
    amounts: [10, 20, 30],
    min: 5,
    max: 60,
    step: 1,
    unit: plural('answer', 'answers'),
    hasLevels: true,
    research: 'A Stroop-style task: overriding the word trains the focus and self-control that are slow right after waking.',
  },
  jacks: {
    group: 'science',
    title: 'Cardio burst',
    description: 'Jumping jacks with the phone in your hand',
    amounts: [15, 30, 50],
    min: 5,
    max: 200,
    step: 5,
    unit: plural('jumping jack', 'jumping jacks'),
    hasLevels: false,
    sensor: 'accelerometer',
    research: 'Sleep inertia comes with slow blood flow to the front of the brain; a little cardio speeds it up (Hilditch & McHill, 2019). Activity also predicts how alert you wake (Vallat et al., 2022).',
  },
};

export const MISSION_GROUPS: { id: MissionGroup; title: string; description?: string }[] = [
  { id: 'brain', title: 'Wake your brain' },
  { id: 'body', title: 'Wake your body' },
  { id: 'science', title: 'Scientific', description: 'Tests and moves taken from sleep research.' },
];

export function missionsIn(group: MissionGroup): MissionType[] {
  return (Object.keys(MISSIONS) as MissionType[]).filter((t) => MISSIONS[t].group === group);
}

export const LEVEL_NAMES: Record<MissionLevel, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

export function defaultMission(type: MissionType): Mission {
  return { type, amount: MISSIONS[type].amounts[0], level: 1 };
}

/** An amount kept inside the mission's limits and on its step. */
export function clampAmount(type: MissionType, amount: number): number {
  const { min, max, step } = MISSIONS[type];
  const stepped = Math.round(amount / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

/** What a phone without the sensor does instead. */
export const FALLBACK_MISSION: Mission = { type: 'math', amount: 3, level: 2 };

/** A small seedable random source, so the tests are repeatable. */
export type Random = () => number;

export function seeded(seed: number): Random {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function between(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export interface Sum {
  text: string;
  answer: number;
}

export function makeSum(level: MissionLevel, random: Random = Math.random): Sum {
  if (level === 1) {
    const a = between(random, 12, 49);
    const b = between(random, 3, 9);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (level === 2) {
    if (random() < 0.5) {
      const a = between(random, 13, 79);
      const b = between(random, 12, 49);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    const a = between(random, 3, 9);
    const b = between(random, 4, 12);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  const a = between(random, 6, 19);
  const b = between(random, 3, 9);
  const c = between(random, 11, 99);
  return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
}

/** Memory grid: the harder, the bigger the grid and the more squares to remember. */
export function memoryGrid(level: MissionLevel): { size: number; tiles: number } {
  return level === 1 ? { size: 3, tiles: 3 } : level === 2 ? { size: 4, tiles: 5 } : { size: 5, tiles: 7 };
}

export function makePattern(level: MissionLevel, round: number, random: Random = Math.random): number[] {
  const { size, tiles } = memoryGrid(level);
  const count = Math.min(size * size - 1, tiles + round);
  const picked = new Set<number>();
  while (picked.size < count) picked.add(Math.floor(random() * size * size));
  return [...picked].sort((a, b) => a - b);
}

export const SENTENCES = [
  'I am awake and ready for today',
  'Today is going to be a good day',
  'I got up the first time',
  'Fresh air and bright light help me wake up',
  'Small steps start a big day',
  'My bed will still be here tonight',
  'Good mornings start with getting up',
];

export function pickSentences(count: number, random: Random = Math.random): string[] {
  const pool = [...SENTENCES];
  const out: string[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}

/** Typing counts if the words match: case, spaces and punctuation don't matter. */
export function sameWords(typed: string, target: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  return norm(typed) === norm(target);
}


// ---- Number hunt: a shuffled board of 1…n, tapped in order.

export function numberBoard(level: MissionLevel, random: Random = Math.random): { size: number; numbers: number[] } {
  const size = level + 2;
  const numbers = Array.from({ length: size * size }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return { size, numbers };
}

// ---- Odd one out: one square a slightly different grey. Harder means more squares, closer greys.

export function oddTile(level: MissionLevel, round: number, random: Random = Math.random): { size: number; odd: number; base: number; other: number } {
  const size = Math.min(6, level + 2 + Math.floor(round / 4));
  const gap = Math.max(0.035, [0.22, 0.14, 0.09][level - 1] - round * 0.008);
  const base = 0.25 + random() * 0.4;
  const other = random() < 0.5 ? base + gap : base - gap;
  return { size, odd: Math.floor(random() * size * size), base, other };
}

// ---- Missing symbol: "12 ? 4 = 48". Only one sign may fit.

export type Sign = '+' | '−' | '×' | '÷';
export const SIGNS: Sign[] = ['+', '−', '×', '÷'];

function apply(a: number, sign: Sign, b: number): number | null {
  if (sign === '+') return a + b;
  if (sign === '−') return a - b;
  if (sign === '×') return a * b;
  return b !== 0 && a % b === 0 ? a / b : null;
}

export function symbolProblem(level: MissionLevel, random: Random = Math.random): { a: number; b: number; result: number; sign: Sign } {
  const max = [12, 30, 60][level - 1];
  for (;;) {
    const sign = SIGNS[Math.floor(random() * SIGNS.length)];
    let a = between(random, 2, max);
    const b = between(random, 2, level === 1 ? 9 : 15);
    if (sign === '÷') a = b * between(random, 2, level === 1 ? 9 : 12);
    const result = apply(a, sign, b);
    if (result === null || result < 0) continue;
    if (SIGNS.filter((s) => apply(a, s, b) === result).length === 1) return { a, b, result, sign };
  }
}

// ---- Unscramble

export const WORDS: Record<MissionLevel, string[]> = {
  1: ['SUN', 'BED', 'TEA', 'DAY', 'RISE', 'WAKE', 'LIGHT', 'COFFEE', 'TOAST', 'SHOWER', 'MORNING', 'SMILE'],
  2: ['SUNRISE', 'BREAKFAST', 'STRETCH', 'BLANKET', 'PILLOW', 'ENERGY', 'WINDOW', 'JOURNEY', 'WEEKEND', 'GARDEN'],
  3: ['ADVENTURE', 'BRILLIANT', 'MOTIVATION', 'CHAMPION', 'DISCOVERY', 'IMAGINATION', 'WONDERFUL', 'TOMORROW'],
};

export function scramble(word: string, random: Random = Math.random): string {
  const letters = word.split('');
  for (let tries = 0; tries < 20; tries++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    if (letters.join('') !== word) break;
  }
  return letters.join('');
}

export function pickWord(level: MissionLevel, random: Random = Math.random): string {
  const list = WORDS[level];
  return list[Math.floor(random() * list.length)];
}

// ---- Reaction test (PVT): a light appears after a random 2–7 s; tap within the limit.

/** Fastest a real reaction can be; anything quicker was a guess. */
export const PVT_FALSE_START_MS = 100;
export const PVT_LIMIT_MS: Record<MissionLevel, number> = { 1: 700, 2: 500, 3: 380 };

export function pvtDelay(random: Random = Math.random): number {
  return 2000 + random() * 5000;
}

export function pvtCounts(reactionMs: number, level: MissionLevel): boolean {
  return reactionMs >= PVT_FALSE_START_MS && reactionMs <= PVT_LIMIT_MS[level];
}

// ---- Arrow test (spatial Stroop): answer where the arrow points, whatever the word says.

export type Side = 'left' | 'right';

export function arrowTrial(level: MissionLevel, random: Random = Math.random): { arrow: Side; word: Side } {
  const arrow: Side = random() < 0.5 ? 'left' : 'right';
  // Harder levels show more words that disagree with the arrow.
  const conflict = random() < [0.4, 0.6, 0.8][level - 1];
  const word: Side = conflict ? (arrow === 'left' ? 'right' : 'left') : arrow;
  return { arrow, word };
}

/** Seconds to answer each arrow, by level. */
export const ARROW_SECONDS: Record<MissionLevel, number> = { 1: 4, 2: 2.5, 3: 1.5 };

export interface Sample {
  x: number;
  y: number;
  z: number;
  /** ms */
  t: number;
}

const magnitude = (s: Sample) => Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);

/** Counts shakes (or the landing of a jumping jack): a jolt above `threshold` g, at most one per `gapMs`. */
export function shakeCounter(threshold = 1.8, gapMs = 250) {
  let last = -Infinity;
  return (s: Sample): boolean => {
    if (magnitude(s) < threshold || s.t - last < gapMs) return false;
    last = s.t;
    return true;
  };
}

/**
 * Counts squats with the phone held to the chest. Going down makes the phone
 * briefly lighter than 1 g, and stopping at the bottom and pushing up makes it
 * heavier: one dip followed by one peak is one squat.
 */
export function squatCounter({ dip = 0.85, peak = 1.15, gapMs = 800 } = {}) {
  let smooth = 1;
  let dipped = false;
  let last = -Infinity;
  return (s: Sample): boolean => {
    smooth = smooth * 0.6 + magnitude(s) * 0.4;
    if (smooth < dip) dipped = true;
    if (dipped && smooth > peak && s.t - last >= gapMs) {
      dipped = false;
      last = s.t;
      return true;
    }
    return false;
  };
}
