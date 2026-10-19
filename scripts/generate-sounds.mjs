// Generates the alarm sounds in assets/sounds as 16-bit mono WAV files.
// Run with `npm run sounds`. Each file stays under 30 s, the iOS limit for
// notification sounds.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function normalize(samples, peak) {
  const max = samples.reduce((m, s) => Math.max(m, Math.abs(s)), 0) || 1;
  return samples.map((s) => (s / max) * peak);
}

// Deep sleeper: a 520 Hz square wave in the T-3 pattern (three 0.5 s beeps,
// then a pause). Fire-safety research found this low tone wakes deep sleepers
// far more reliably than the usual ~3 kHz beep. Band-limited (odd harmonics
// below 9 kHz) so it doesn't alias into a harsh buzz.
function deepTone(seconds) {
  const out = new Float32Array(RATE * seconds);
  const freq = 520;
  const harmonics = [];
  for (let k = 1; k * freq < 9000; k += 2) harmonics.push(k);
  const cycle = 4; // 3 × (0.5 on + 0.5 off) + 1 s extra pause
  const fade = 0.005;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const inCycle = t % cycle;
    if (inCycle >= 3) continue;
    const inBeep = inCycle % 1;
    if (inBeep >= 0.5) continue;
    const env = Math.min(1, inBeep / fade, (0.5 - inBeep) / fade);
    let s = 0;
    for (const k of harmonics) s += Math.sin(2 * Math.PI * freq * k * t) / k;
    out[i] = s * env;
  }
  return normalize(out, 0.9);
}

// A bell-like note: a few partials with exponential decay.
function addBell(out, start, freq, gain, decay = 1.4) {
  const partials = [
    [1, 1],
    [2, 0.35],
    [2.76, 0.12],
    [4.07, 0.05],
  ];
  const from = Math.floor(start * RATE);
  const length = Math.floor(decay * 4 * RATE);
  for (let i = 0; i < length && from + i < out.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.008);
    let s = 0;
    for (const [ratio, amp] of partials) {
      s += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp((-t * ratio) / decay);
    }
    out[from + i] += s * attack * gain;
  }
}

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66 };

// Gentle: a slow, rising pentatonic melody. A 2020 RMIT survey linked melodic
// alarms with less morning grogginess than harsh beeps.
function gentleMelody(seconds) {
  const out = new Float32Array(RATE * seconds);
  const phrases = [
    ['C5', 'E5', 'G5', 'A5'],
    ['G5', 'A5', 'C6', 'A5'],
    ['D5', 'G5', 'A5', 'D6'],
    ['C6', 'A5', 'G5', 'E5'],
  ];
  const phraseLength = 3.5;
  let n = 0;
  for (let t = 0; t + phraseLength <= seconds; t += phraseLength, n++) {
    phrases[n % phrases.length].forEach((name, j) => addBell(out, t + j * 0.42, NOTE[name], j === 3 ? 0.9 : 0.7));
  }
  return normalize(out, 0.8);
}

// Two soft notes for "Are you awake?" and bedtime reminders.
function chime() {
  const out = new Float32Array(RATE * 2.5);
  addBell(out, 0, NOTE.G5, 0.8, 0.9);
  addBell(out, 0.35, NOTE.C6, 1, 1.1);
  return normalize(out, 0.7);
}

mkdirSync(OUT, { recursive: true });
const files = {
  'deep_520hz.wav': deepTone(28),
  'gentle_melody.wav': gentleMelody(28),
  'chime.wav': chime(),
};
for (const [name, samples] of Object.entries(files)) {
  writeFileSync(join(OUT, name), wav(samples));
  console.log(`assets/sounds/${name}  ${(samples.length / RATE).toFixed(1)} s`);
}
