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
  | 'jacks'
  | 'sprint'
  | 'twists'
  | 'reach'
  | 'light';
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
  /** Quick picks in the editor; any number from min to max (1–100) can also be set. */
  amounts: number[];
  min: number;
  max: number;
  step: number;
  unit: (n: number) => string;
  hasLevels: boolean;
  /** Needs a sensor or the camera; swapped for sums on a phone without one. */
  sensor?: 'accelerometer' | 'pedometer' | 'camera' | 'gyroscope' | 'light';
  /** For the Scientific missions: where the idea comes from. */
  research?: string;
}

export const MAX_MISSIONS = 5;

const plural = (one: string, many: string) => (n: number) => `${n} ${n === 1 ? one : many}`;

export const MISSIONS: Record<MissionType, MissionInfo> = {
  math: { group: 'brain', title: 'Math', description: 'Solve a few sums', amounts: [3, 5, 10], min: 1, max: 100, step: 1, unit: plural('sum', 'sums'), hasLevels: true },
  memory: { group: 'brain', title: 'Memory', description: 'Repeat a pattern of squares', amounts: [2, 3, 5], min: 1, max: 100, step: 1, unit: plural('round', 'rounds'), hasLevels: true },
  typing: { group: 'brain', title: 'Typing', description: 'Type a sentence word for word', amounts: [1, 2, 3], min: 1, max: 100, step: 1, unit: plural('sentence', 'sentences'), hasLevels: false },
  numbers: { group: 'brain', title: 'Number hunt', description: 'Tap the numbers in order, as fast as you can', amounts: [1, 2, 3], min: 1, max: 100, step: 1, unit: plural('board', 'boards'), hasLevels: true },
  oddtile: { group: 'brain', title: 'Odd one out', description: 'Find the square that is a different grey', amounts: [5, 10, 15], min: 1, max: 100, step: 1, unit: plural('round', 'rounds'), hasLevels: true },
  symbol: { group: 'brain', title: 'Missing symbol', description: 'Pick the sign that makes the sum true', amounts: [3, 5, 10], min: 1, max: 100, step: 1, unit: plural('problem', 'problems'), hasLevels: true },
  unscramble: { group: 'brain', title: 'Unscramble', description: 'Put the letters back in order', amounts: [2, 3, 5], min: 1, max: 100, step: 1, unit: plural('word', 'words'), hasLevels: true },
  shake: { group: 'body', title: 'Shake', description: 'Shake your phone hard', amounts: [20, 40, 80], min: 1, max: 100, step: 1, unit: plural('shake', 'shakes'), hasLevels: false, sensor: 'accelerometer' },
  squats: { group: 'body', title: 'Squats', description: 'Hold the phone to your chest and squat', amounts: [5, 10, 20], min: 1, max: 100, step: 1, unit: plural('squat', 'squats'), hasLevels: false, sensor: 'accelerometer' },
  steps: { group: 'body', title: 'Steps', description: 'Get up and walk around', amounts: [20, 50, 100], min: 1, max: 100, step: 1, unit: plural('step', 'steps'), hasLevels: false, sensor: 'pedometer' },
  qr: {
    group: 'body',
    title: 'QR / Barcode',
    description: 'Get up and scan a code in another room',
    amounts: [1],
    min: 1,
    max: 1,
    step: 1,
    unit: plural('scan', 'scans'),
    hasLevels: false,
    sensor: 'camera',
    research: 'Tip: put the code by the bathroom sink and splash cold water on your face and hands. Cooling your hands and feet may help you wake faster (Hilditch & McHill, 2019).',
  },
  sprint: {
    group: 'body',
    title: '30-second sprint',
    description: 'Run on the spot or do high knees, phone in hand',
    amounts: [20, 30, 45],
    min: 10,
    max: 100,
    step: 5,
    unit: plural('second', 'seconds'),
    hasLevels: false,
    sensor: 'accelerometer',
    research: '30 seconds of hard exercise right after waking made people feel less sleepy and boosted the cortisol that helps you wake (Kovac et al., 2021).',
  },
  twists: {
    group: 'body',
    title: 'Torso twists',
    description: 'Hold the phone to your chest and twist left and right',
    amounts: [10, 20, 30],
    min: 2,
    max: 100,
    step: 2,
    unit: plural('twist', 'twists'),
    hasLevels: false,
    sensor: 'gyroscope',
    research: 'Standing up and moving gets blood flowing to the brain, which is slow to recover right after waking (Kovac et al., 2020).',
  },
  reach: {
    group: 'body',
    title: 'Reach for the sky',
    description: 'Stand up, raise the phone high above your head, bring it down',
    amounts: [5, 10, 20],
    min: 1,
    max: 100,
    step: 1,
    unit: plural('reach', 'reaches'),
    hasLevels: false,
    sensor: 'accelerometer',
  },
  light: {
    group: 'body',
    title: 'Let the light in',
    description: 'Open the curtains or turn on the lights until the room is bright (Android)',
    amounts: [10, 20, 30],
    min: 5,
    max: 100,
    step: 5,
    unit: plural('second', 'seconds'),
    hasLevels: true,
    sensor: 'light',
    research: 'Bright light after waking made people feel more alert and energetic at home (Sleep Health, 2024). Easy needs room lights, Medium a bright room, Hard daylight.',
  },
  pvt: {
    group: 'science',
    title: 'Reaction test',
    description: 'Tap the moment the light appears',
    amounts: [5, 10, 20],
    min: 1,
    max: 100,
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
    min: 1,
    max: 100,
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
    min: 1,
    max: 100,
    step: 1,
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

/** Several shapes of sum per level, so a long mission keeps changing. Answers are never negative. */
const SUMS: Record<MissionLevel, ((r: Random) => Sum)[]> = {
  1: [
    (r) => {
      const a = between(r, 12, 59);
      const b = between(r, 3, 9);
      return { text: `${a} + ${b}`, answer: a + b };
    },
    (r) => {
      const a = between(r, 15, 60);
      const b = between(r, 2, 9);
      return { text: `${a} − ${b}`, answer: a - b };
    },
    (r) => {
      const a = between(r, 2, 9);
      const b = between(r, 2, 9);
      return { text: `${a} × ${b}`, answer: a * b };
    },
  ],
  2: [
    (r) => {
      const a = between(r, 13, 89);
      const b = between(r, 12, 69);
      return { text: `${a} + ${b}`, answer: a + b };
    },
    (r) => {
      const a = between(r, 50, 99);
      const b = between(r, 12, 49);
      return { text: `${a} − ${b}`, answer: a - b };
    },
    (r) => {
      const a = between(r, 3, 12);
      const b = between(r, 4, 15);
      return { text: `${a} × ${b}`, answer: a * b };
    },
    (r) => {
      const b = between(r, 3, 9);
      const answer = between(r, 4, 15);
      return { text: `${b * answer} ÷ ${b}`, answer };
    },
  ],
  3: [
    (r) => {
      const a = between(r, 6, 19);
      const b = between(r, 3, 9);
      const c = between(r, 11, 99);
      return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
    },
    (r) => {
      const a = between(r, 7, 19);
      const b = between(r, 4, 9);
      const c = between(r, 5, a * b - 1);
      return { text: `${a} × ${b} − ${c}`, answer: a * b - c };
    },
    (r) => {
      const a = between(r, 3, 19);
      const b = between(r, 2, 19);
      const c = between(r, 3, 9);
      return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c };
    },
    (r) => {
      const a = between(r, 12, 39);
      const b = between(r, 11, 29);
      return { text: `${a} × ${b}`, answer: a * b };
    },
    (r) => {
      const a = between(r, 101, 499);
      const b = between(r, 56, 399);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  ],
};

export function makeSum(level: MissionLevel, random: Random = Math.random): Sum {
  const shapes = SUMS[level];
  return shapes[Math.floor(random() * shapes.length)](random);
}

/**
 * Wraps a generator so it doesn't give the same thing twice in one mission:
 * it tries again until it finds something new (sums, problems), and only
 * allows a repeat once nothing new turns up.
 */
export function noRepeats<T>(make: () => T, key: (item: T) => string, tries = 200): () => T {
  const used = new Set<string>();
  return () => {
    let item = make();
    for (let i = 0; i < tries && used.has(key(item)); i++) item = make();
    used.add(key(item));
    return item;
  };
}

/** Draws from a list in a shuffled order, using every item before any comes back, never the same twice in a row. */
export function shuffleBag<T>(items: readonly T[], random: Random = Math.random): () => T {
  let bag: T[] = [];
  let last: T | undefined;
  return () => {
    if (bag.length === 0) {
      bag = [...items];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    last = bag.pop() as T;
    return last;
  };
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
  'A glass of water wakes up my body',
  'I open the curtains and let the light in',
  'Every morning is a fresh start',
  'I will stretch before I check my phone',
  'The coffee is waiting for me',
  'I choose to get up instead of snoozing',
  'My future self will thank me',
  'One good morning leads to another',
  'I am stronger than my pillow',
  'Sunlight tells my body it is daytime',
  'I make my bed as soon as I get up',
  'Today I will do one thing that matters',
  'Big days begin with small wins',
  'I breathe in deeply and stand up',
  'The world is better when I am awake',
  'Getting up early gives me more time',
  'I feel more awake with every word I type',
  'Cold water on my face wakes me up',
  'I am grateful for a new day',
  'Moving my body clears my head',
  'Breakfast gives me energy for the morning',
  'I keep the same wake time every day',
  'My goals are bigger than my blanket',
  'This morning I will take a short walk outside',
  'I listen to music I love to start the day',
  'Each sentence brings me closer to my coffee',
  'I will not let the alarm win today',
  'A calm morning makes a calm day',
  'I plan my day with a clear head',
  'Bright light and fresh air are my wake up team',
  'The first hour sets the tone for the day',
  'I put my feet on the floor and smile',
  'Waking up on time is a promise to myself',
];

/** `count` sentences: each one once before any comes back, never twice in a row. */
export function pickSentences(count: number, random: Random = Math.random): string[] {
  const next = shuffleBag(SENTENCES, random);
  return Array.from({ length: count }, next);
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
  1: ['SUN', 'BED', 'TEA', 'DAY', 'RISE', 'WAKE', 'LIGHT', 'TOAST', 'SMILE', 'DREAM', 'CLOCK', 'BIRD', 'MILK', 'WALK', 'JUICE', 'HAPPY', 'EARLY', 'SHINE', 'FRESH', 'BREAD', 'RAIN', 'CLOUD', 'NAP', 'YAWN', 'SOCKS', 'DOOR', 'LAMP', 'SHOE', 'MUSIC', 'PLANT', 'EGG', 'HONEY', 'APPLE', 'TRAIN', 'DANCE', 'SLEEP', 'ALARM', 'GLOW', 'STAR', 'MOON'],
  2: ['SUNRISE', 'BREAKFAST', 'STRETCH', 'BLANKET', 'PILLOW', 'ENERGY', 'WINDOW', 'JOURNEY', 'WEEKEND', 'GARDEN', 'COFFEE', 'SHOWER', 'MORNING', 'KITCHEN', 'BALCONY', 'SNOOZE', 'BICYCLE', 'PANCAKE', 'CEREAL', 'BLOSSOM', 'HORIZON', 'SUNSHINE', 'MEADOW', 'RHYTHM', 'FOREST', 'CAPTAIN', 'PICNIC', 'LANTERN', 'MIRROR', 'TRAVEL', 'ORANGE', 'PLANET', 'SPRING', 'SUMMER', 'WINTER', 'AUTUMN', 'HEALTHY', 'FREEDOM', 'BRIGHTER', 'PUZZLE'],
  3: ['ADVENTURE', 'BRILLIANT', 'MOTIVATION', 'CHAMPION', 'DISCOVERY', 'IMAGINATION', 'WONDERFUL', 'TOMORROW', 'BUTTERFLY', 'CELEBRATE', 'KNOWLEDGE', 'MOUNTAINEER', 'EXCELLENT', 'FANTASTIC', 'GRATITUDE', 'HAPPINESS', 'INCREDIBLE', 'JOURNALIST', 'LANDSCAPE', 'MARATHON', 'NIGHTINGALE', 'OPPORTUNITY', 'PERSEVERANCE', 'QUESTIONNAIRE', 'REMARKABLE', 'SPECTACULAR', 'TELESCOPE', 'UNIVERSE', 'VOLUNTEER', 'WATERFALL', 'XYLOPHONE', 'YESTERDAY', 'ZEPPELIN', 'ASTRONAUT', 'BLUEBERRY', 'CROCODILE', 'DETECTIVE', 'ELEPHANT', 'FIREWORKS', 'GEOGRAPHY'],
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

/** Words for one mission: every word of the level once before any repeats. */
export function wordBag(level: MissionLevel, random: Random = Math.random): () => string {
  return shuffleBag(WORDS[level], random);
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

/**
 * Seconds of hard movement, for the sprint: the clock only runs while the
 * phone is moving hard (more than `threshold` g away from still) at least
 * once every `holdMs`. Stop moving and it stops.
 */
export function sprintTimer(threshold = 0.6, holdMs = 400) {
  let lastHard = -Infinity;
  let lastT: number | null = null;
  let activeMs = 0;
  return (s: Sample): number => {
    if (Math.abs(magnitude(s) - 1) >= threshold) lastHard = s.t;
    if (lastT !== null && s.t - lastHard <= holdMs) activeMs += Math.min(s.t - lastT, 200);
    lastT = s.t;
    return activeMs;
  };
}

/** A gyroscope reading: rotation speed in radians per second around each axis. */
export interface Rotation {
  x: number;
  y: number;
  z: number;
  t: number;
}

/**
 * Counts torso twists with the phone held to the chest: a fast turn one way
 * (above `rate` rad/s around the strongest axis), then one the other way.
 * Each turn counts as one twist.
 */
export function twistCounter(rate = 2, gapMs = 250) {
  let lastSign = 0;
  let last = -Infinity;
  return (r: Rotation): boolean => {
    const axis = [r.x, r.y, r.z].reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a));
    if (Math.abs(axis) < rate || sign(axis) === lastSign || r.t - last < gapMs) return false;
    lastSign = sign(axis);
    last = r.t;
    return true;
  };
}
const sign = (n: number) => (n > 0 ? 1 : -1);

/**
 * Counts reaches: raising the phone overhead pushes it hard (heavier than
 * `push` g) and stopping at the top makes it light (below `stop` g); lowering
 * does the opposite. Two such movements, up and down, are one reach.
 */
export function reachCounter({ push = 1.35, stop = 0.7, gapMs = 350 } = {}) {
  let smooth = 1;
  let heavy = false;
  let light = false;
  let moves = 0;
  let last = -Infinity;
  return (sample: Sample): boolean => {
    smooth = smooth * 0.6 + magnitude(sample) * 0.4;
    if (smooth > push) heavy = true;
    if (smooth < stop) light = true;
    if (!(heavy && light) || sample.t - last < gapMs) return false;
    heavy = light = false;
    last = sample.t;
    moves += 1;
    return moves % 2 === 0;
  };
}

/** Lux needed per level: room lights, a bright room, daylight. */
export const LIGHT_LUX: Record<MissionLevel, number> = { 1: 100, 2: 400, 3: 1000 };

/** Seconds spent in light at least as bright as the level asks. */
export function lightTimer(level: MissionLevel) {
  let lastT: number | null = null;
  let litMs = 0;
  return (lux: number, t: number): number => {
    if (lastT !== null && lux >= LIGHT_LUX[level]) litMs += Math.min(t - lastT, 1000);
    lastT = t;
    return litMs;
  };
}
