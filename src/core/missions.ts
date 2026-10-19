export type MissionType = 'math' | 'memory' | 'typing' | 'shake' | 'squats' | 'steps';
export type MissionLevel = 1 | 2 | 3;

/** One task to finish before the alarm turns off. */
export interface Mission {
  type: MissionType;
  /** How many: sums, rounds, sentences, shakes, squats or steps. */
  amount: number;
  /** Difficulty, for the brain missions that have one. */
  level: MissionLevel;
}

export interface MissionInfo {
  group: 'brain' | 'body';
  title: string;
  description: string;
  amounts: number[];
  unit: (n: number) => string;
  hasLevels: boolean;
  /** Needs a sensor; swapped for sums on a phone without one. */
  sensor?: 'accelerometer' | 'pedometer';
}

export const MAX_MISSIONS = 5;

export const MISSIONS: Record<MissionType, MissionInfo> = {
  math: { group: 'brain', title: 'Math', description: 'Solve a few sums', amounts: [3, 5, 10], unit: (n) => `${n} sums`, hasLevels: true },
  memory: { group: 'brain', title: 'Memory', description: 'Repeat a pattern of squares', amounts: [2, 3, 5], unit: (n) => `${n} rounds`, hasLevels: true },
  typing: { group: 'brain', title: 'Typing', description: 'Type a sentence word for word', amounts: [1, 2, 3], unit: (n) => (n === 1 ? '1 sentence' : `${n} sentences`), hasLevels: false },
  shake: { group: 'body', title: 'Shake', description: 'Shake your phone hard', amounts: [20, 40, 80], unit: (n) => `${n} shakes`, hasLevels: false, sensor: 'accelerometer' },
  squats: { group: 'body', title: 'Squats', description: 'Hold the phone to your chest and squat', amounts: [5, 10, 20], unit: (n) => `${n} squats`, hasLevels: false, sensor: 'accelerometer' },
  steps: { group: 'body', title: 'Steps', description: 'Get up and walk around', amounts: [20, 50, 100], unit: (n) => `${n} steps`, hasLevels: false, sensor: 'pedometer' },
};

export const BRAIN: MissionType[] = ['math', 'memory', 'typing'];
export const BODY: MissionType[] = ['shake', 'squats', 'steps'];
export const LEVEL_NAMES: Record<MissionLevel, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

export function defaultMission(type: MissionType): Mission {
  return { type, amount: MISSIONS[type].amounts[0], level: 1 };
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

export interface Sample {
  x: number;
  y: number;
  z: number;
  /** ms */
  t: number;
}

const magnitude = (s: Sample) => Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);

/** Counts shakes: a jolt above `threshold` g, at most one per `gapMs`. */
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
