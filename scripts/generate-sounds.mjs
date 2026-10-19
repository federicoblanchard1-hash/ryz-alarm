// Generates the alarm sounds in assets/sounds as 16-bit mono WAV files.
// Run with `npm run sounds`. Each file stays under 30 s, the iOS limit for
// notification sounds.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The original two tones use 22.05 kHz; the newer ones 16 kHz, which keeps the app smaller.
let RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

function wav(samples, rate = RATE) {
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
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
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


// ---- Loud: sirens and alarm-clock classics, at full scale from the first second.

const tau = 2 * Math.PI;
/** A band-limited sawtooth-ish tone: odd and even harmonics under the Nyquist limit. */
function richTone(phase, freq, brightness = 6) {
  let s = 0;
  for (let k = 1; k <= brightness && k * freq < RATE / 2 - 500; k++) s += Math.sin(phase * k) / k;
  return s;
}
const softClip = (x) => Math.tanh(x * 1.6);

// Air-raid siren: a slow rise and fall between 350 and 900 Hz.
function airRaid(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const freq = 350 + 550 * (0.5 - 0.5 * Math.cos((tau * t) / 6));
    phase += (tau * freq) / RATE;
    out[i] = softClip(richTone(phase, freq, 5) * 0.8);
  }
  return normalize(out, 0.95);
}

// Emergency "yelp": a fast up-down sweep, four times a second.
function yelp(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const tri = 1 - Math.abs(((t * 4) % 2) - 1);
    const freq = 700 + 900 * tri;
    phase += (tau * freq) / RATE;
    out[i] = softClip(richTone(phase, freq, 4));
  }
  return normalize(out, 0.95);
}

// European two-tone siren: 960 and 770 Hz, half a second each.
function twoTone(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const freq = Math.floor(t / 0.55) % 2 === 0 ? 960 : 770;
    phase += (tau * freq) / RATE;
    out[i] = softClip(richTone(phase, freq, 6));
  }
  return normalize(out, 0.95);
}

// Digital alarm clock: four quick beeps at 2.6 kHz, then a short gap.
function buzzer(seconds) {
  const out = new Float32Array(RATE * seconds);
  const freq = 2600;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const inCycle = t % 1;
    if (inCycle >= 0.56) continue;
    const inBeep = inCycle % 0.14;
    if (inBeep >= 0.07) continue;
    const env = Math.min(1, inBeep / 0.003, (0.07 - inBeep) / 0.003);
    out[i] = (Math.sin(tau * freq * t) + Math.sin(tau * freq * 3 * t) / 3 > 0 ? 1 : -1) * 0.5 * env + Math.sin(tau * freq * t) * 0.5 * env;
  }
  return normalize(out, 0.9);
}

// Old mechanical alarm clock: a hammer hitting two bells about 18 times a second.
function mechanicalBell(seconds) {
  const out = new Float32Array(RATE * seconds);
  const partials = [
    [2100, 1],
    [2870, 0.6],
    [4300, 0.35],
    [5600, 0.2],
  ];
  const strikes = [];
  for (let t = 0; t < seconds; t += 1 / 18) if (t % 2.6 < 2) strikes.push(t);
  for (const start of strikes) {
    const from = Math.floor(start * RATE);
    const length = Math.floor(0.25 * RATE);
    for (let i = 0; i < length && from + i < out.length; i++) {
      const t = i / RATE;
      let s = 0;
      for (const [f, a] of partials) s += a * Math.sin(tau * f * t) * Math.exp(-t * (14 + f / 400));
      out[from + i] += s;
    }
  }
  return normalize(out.map((x) => softClip(x * 0.6)), 0.95);
}

// ---- Calm: soft sounds that fade in.

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Wind chimes: soft high bells on a pentatonic scale at random moments.
function windChimes(seconds) {
  const out = new Float32Array(RATE * seconds);
  const random = seededRandom(11);
  const notes = [NOTE.C6, NOTE.D6, 1318.5, 1568, 1760, 2093];
  for (let t = 0; t < seconds - 1; t += 0.15 + random() * 0.6) {
    addBell(out, t, notes[Math.floor(random() * notes.length)], 0.25 + random() * 0.35, 1.6);
  }
  return normalize(out, 0.7);
}

// Ocean waves: filtered noise that swells and falls about every 8 seconds.
function ocean(seconds) {
  const out = new Float32Array(RATE * seconds);
  const random = seededRandom(5);
  let brown = 0;
  let low = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const white = random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    low += 0.08 * (white - low);
    const swell = Math.pow(0.5 - 0.5 * Math.cos((tau * t) / 8 + Math.sin(t * 0.3)), 2);
    out[i] = brown * 3 * (0.25 + swell) + low * 0.35 * swell;
  }
  // Fade the ends so the loop has no click.
  for (let i = 0; i < RATE; i++) {
    out[i] *= i / RATE;
    out[out.length - 1 - i] *= i / RATE;
  }
  return normalize(out, 0.75);
}

// Birdsong: short frequency-swept chirps in little phrases over a quiet breeze.
function birds(seconds) {
  const out = new Float32Array(RATE * seconds);
  const random = seededRandom(23);
  for (let i = 0; i < out.length; i++) out[i] = (random() * 2 - 1) * 0.004;
  let t = 0.4;
  while (t < seconds - 1.5) {
    const base = 2600 + random() * 2200;
    const notes = 3 + Math.floor(random() * 5);
    const up = random() > 0.4;
    for (let n = 0; n < notes; n++) {
      const length = 0.05 + random() * 0.07;
      const from = Math.floor(t * RATE);
      let phase = 0;
      for (let i = 0; i < length * RATE && from + i < out.length; i++) {
        const x = i / (length * RATE);
        const freq = base * (up ? 1 + 0.5 * x : 1.5 - 0.5 * x) + 300 * Math.sin(tau * 40 * (i / RATE));
        phase += (tau * freq) / RATE;
        out[from + i] += Math.sin(phase) * Math.sin(Math.PI * x) * 0.5;
      }
      t += length + 0.03 + random() * 0.06;
    }
    t += 0.5 + random() * 1.6;
  }
  return normalize(out, 0.7);
}

// Sunrise: warm, slowly changing chords of soft detuned tones.
function sunrise(seconds) {
  const out = new Float32Array(RATE * seconds);
  const chords = [
    [261.63, 329.63, 392, 493.88],
    [220, 261.63, 329.63, 392],
    [174.61, 220, 261.63, 329.63],
    [196, 246.94, 293.66, 392],
  ];
  const each = 7;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const index = Math.floor(t / each);
    const inChord = t - index * each;
    const env = Math.min(1, inChord / 2.5, (each - inChord) / 2.5);
    let s = 0;
    for (const f of chords[index % chords.length]) {
      s += Math.sin(tau * f * t) + 0.6 * Math.sin(tau * f * 1.003 * t) + 0.15 * Math.sin(tau * f * 2 * t);
    }
    out[i] = s * Math.max(0, env);
  }
  return normalize(out, 0.7);
}

// Music box: a quick, high, light arpeggio.
function musicBox(seconds) {
  const out = new Float32Array(RATE * seconds);
  const tune = ['C6', 'G5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C6', 'A5', 'G5', 'E5', 'D6', 'C6', 'A5', 'G5'];
  for (let t = 0, n = 0; t < seconds - 1.5; t += 0.3, n++) {
    addBell(out, t, NOTE[tune[n % tune.length]] * 2, n % 4 === 0 ? 0.8 : 0.55, 0.8);
  }
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

RATE = 16000;
const smaller = {
  'loud_air_raid.wav': airRaid(28),
  'loud_yelp.wav': yelp(28),
  'loud_two_tone.wav': twoTone(28),
  'loud_buzzer.wav': buzzer(28),
  'loud_bell.wav': mechanicalBell(28),
  'calm_wind_chimes.wav': windChimes(28),
  'calm_ocean.wav': ocean(28),
  'calm_birds.wav': birds(28),
  'calm_sunrise.wav': sunrise(28),
  'calm_music_box.wav': musicBox(28),
};
for (const [name, samples] of Object.entries(smaller)) {
  writeFileSync(join(OUT, name), wav(samples, RATE));
  console.log(`assets/sounds/${name}  ${(samples.length / RATE).toFixed(1)} s`);
}
