// Generates the alarm sounds in assets/sounds as 16-bit mono WAV files.
// Run with `npm run sounds`. Each file stays under 30 s, the iOS limit for
// notification sounds. Six sounds are real recordings instead (gentle melody,
// birdsong, kalimba, digital buzzer, alarm clock bell, continuous tone): see
// scripts/real-sounds.py; this script leaves those files alone.
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

// ---- Helpers for the larger catalogue.

/** Make a clip loop without a click: blend its last `fade` seconds into its start. */
function loopable(out, fade = 1) {
  const n = Math.floor(fade * RATE);
  const body = out.slice(0, out.length - n);
  for (let i = 0; i < n; i++) {
    const x = i / n;
    body[i] = body[i] * Math.sqrt(x) + out[out.length - n + i] * Math.sqrt(1 - x);
  }
  return body;
}

/** A plucked string (Karplus–Strong): noise in a delay line that loses its highs each pass. */
function addPluck(out, start, freq, gain, { decay = 0.996, bright = 0.5, random = Math.random } = {}) {
  const period = Math.max(2, Math.round(RATE / freq));
  const line = new Float32Array(period);
  let last = 0;
  for (let i = 0; i < period; i++) {
    last = last * (1 - bright) + (random() * 2 - 1) * bright;
    line[i] = last;
  }
  const from = Math.floor(start * RATE);
  const length = Math.floor(RATE * 4);
  let idx = 0;
  for (let i = 0; i < length && from + i < out.length; i++) {
    const next = (idx + 1) % period;
    const v = line[idx];
    line[idx] = decay * 0.5 * (v + line[next]);
    out[from + i] += v * gain;
    idx = next;
  }
}

/** A struck note made of chosen partials, each [ratio, amplitude, decay seconds]. */
function addPartials(out, start, freq, gain, partials, attack = 0.005) {
  const from = Math.floor(start * RATE);
  const longest = Math.max(...partials.map((p) => p[2]));
  const length = Math.floor(longest * 5 * RATE);
  for (let i = 0; i < length && from + i < out.length; i++) {
    const t = i / RATE;
    let s = 0;
    for (const [ratio, amp, decay] of partials) {
      if (freq * ratio >= RATE / 2 - 200) continue;
      s += amp * Math.sin(tau * freq * ratio * t) * Math.exp(-t / decay);
    }
    out[from + i] += s * Math.min(1, t / attack) * gain;
  }
}

/** Band-limited square wave from odd harmonics. */
function square(phase, freq) {
  let s = 0;
  for (let k = 1; k * freq < RATE / 2 - 300; k += 2) s += Math.sin(phase * k) / k;
  return s;
}

/** Repeating on/off gate with short ramps, so beeps don't click. */
function gate(t, period, on, ramp = 0.004) {
  const x = t % period;
  if (x >= on) return 0;
  return Math.min(1, x / ramp, (on - x) / ramp);
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ---- More scientific sounds.

// 400 Hz square wave, T-3. Ball & Bruck (2004) found low-pitched square
// waves around 400–520 Hz woke sleepers better than the 3 kHz smoke alarm.
function deep400(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    phase += (tau * 400) / RATE;
    const c = t % 4;
    out[i] = c < 3 ? square(phase, 400) * gate(c, 1, 0.5, 0.005) : 0;
  }
  return normalize(out, 0.9);
}

// Rising melody: a tune that climbs in pitch and gets louder. McFarlane et al.
// (2020) linked melodic alarms with less sleep inertia than harsh beeps.
function risingMelody(seconds) {
  const out = new Float32Array(RATE * seconds);
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  let t = 0;
  for (let bar = 0; t < seconds - 2; bar++) {
    const root = 60 + Math.min(12, bar * 2);
    const level = Math.min(1, 0.35 + bar * 0.09);
    for (let j = 0; j < 6 && t < seconds - 2; j++, t += 0.38) {
      const note = root + scale[(j + bar) % 6];
      addPartials(out, t, midi(note), level, [
        [1, 1, 0.9],
        [2, 0.4, 0.5],
        [3, 0.15, 0.3],
      ]);
    }
    t += 0.4;
  }
  return normalize(out, 0.85);
}

// Rhythmic melody: a bright, steady, danceable riff. The same RMIT work rated
// melody and rhythm as what made an alarm feel less groggy to wake to.
function rhythmicMelody(seconds) {
  const out = new Float32Array(RATE * seconds);
  const riff = [72, 76, 79, 76, 81, 79, 76, 74];
  const step = 0.2;
  for (let n = 0, t = 0; t < seconds - 1; n++, t += step) {
    if (n % 16 === 7 || n % 16 === 15) continue;
    addPartials(out, t, midi(riff[n % riff.length]), n % 4 === 0 ? 1 : 0.7, [
      [1, 1, 0.25],
      [2, 0.5, 0.15],
      [4, 0.2, 0.08],
    ]);
    if (n % 4 === 0) addPartials(out, t, midi(48 + (Math.floor(n / 8) % 2) * 5), 0.8, [[1, 1, 0.35], [2, 0.3, 0.2]]);
  }
  return normalize(out, 0.85);
}

// ---- More loud sounds.

// Smoke detector: the piercing 3.1 kHz T-3 pattern.
function smokeDetector(seconds) {
  const out = new Float32Array(RATE * seconds);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const c = t % 4;
    out[i] = c < 3 ? Math.sin((tau * 3100 * t)) * gate(c, 1, 0.5) + 0.25 * Math.sin(tau * 6200 * t) * gate(c, 1, 0.5) : 0;
  }
  return normalize(out, 0.95);
}

// Fire bell / school bell: a hammer striking a gong 22 times a second, without pause.
function fireBell(seconds) {
  const out = new Float32Array(RATE * seconds);
  const partials = [
    [1, 1, 0.09],
    [2.4, 0.6, 0.06],
    [3.9, 0.35, 0.04],
    [5.3, 0.2, 0.03],
  ];
  for (let t = 0; t < seconds; t += 1 / 22) addPartials(out, t, 1400 + 30 * Math.sin(t * 3), 1, partials, 0.001);
  return normalize(out.map((x) => softClip(x * 0.5)), 0.95);
}

// Classic phone: a bell trill in the UK double-ring cadence.
function phoneRing(seconds) {
  const out = new Float32Array(RATE * seconds);
  const partials = [
    [1, 1, 0.06],
    [1.52, 0.6, 0.05],
    [2.8, 0.25, 0.03],
  ];
  for (let t = 0; t < seconds; t += 1 / 20) {
    const c = t % 3;
    if (c < 0.4 || (c >= 0.6 && c < 1)) addPartials(out, t, 1700, 1, partials, 0.001);
  }
  return normalize(out.map((x) => softClip(x * 0.6)), 0.95);
}

// Car alarm: cycles through a whoop, fast chirps, a two-tone and a pulse.
function carAlarm(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const part = Math.floor(t / 3.5) % 4;
    const x = t % 3.5;
    let freq;
    let amp = 1;
    if (part === 0) freq = 800 + 1600 * ((x * 2) % 1);
    else if (part === 1) {
      freq = 2400;
      amp = gate(x, 0.1, 0.05);
    } else if (part === 2) freq = Math.floor(x / 0.25) % 2 ? 1300 : 1800;
    else {
      freq = 1500 + 500 * Math.sin(tau * 12 * x);
      amp = gate(x, 0.5, 0.35);
    }
    phase += (tau * freq) / RATE;
    out[i] = softClip(richTone(phase, freq, 3)) * amp;
  }
  return normalize(out, 0.95);
}

// Klaxon: the "ah-OO-gah" dive alarm of old submarines and cars.
function klaxon(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const x = t % 1.4;
    const on = x < 0.9;
    const freq = 220 + 260 * Math.min(1, x / 0.25) - (x > 0.6 ? 120 * ((x - 0.6) / 0.3) : 0);
    phase += (tau * freq) / RATE;
    const env = on ? Math.min(1, x / 0.02, (0.9 - x) / 0.04) : 0;
    out[i] = softClip(richTone(phase, freq, 12) * 1.4) * env;
  }
  return normalize(out, 0.95);
}

// Red alert: a rising whoop, again and again.
function redAlert(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const x = t % 1.1;
    const freq = 350 + 900 * Math.pow(Math.min(1, x / 0.8), 1.4);
    phase += (tau * freq) / RATE;
    out[i] = softClip(square(phase, freq) * 0.9) * gate(x, 1.1, 0.85, 0.01);
  }
  return normalize(out, 0.95);
}

// Wail: the long rise and fall of a police or ambulance siren.
function wail(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const freq = 650 + 750 * (0.5 - 0.5 * Math.cos((tau * t) / 3.2));
    phase += (tau * freq) / RATE;
    out[i] = softClip(richTone(phase, freq, 5));
  }
  return normalize(out, 0.95);
}

// Hi-lo: a fast alternating two-note siren.
function hiLo(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const freq = Math.floor(t / 0.25) % 2 ? 1100 : 820;
    phase += (tau * freq) / RATE;
    out[i] = softClip(square(phase, freq));
  }
  return normalize(out, 0.95);
}

// Rapid pulse: eight sharp beeps a second, nonstop.
function rapidPulse(seconds) {
  const out = new Float32Array(RATE * seconds);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    out[i] = square((tau * 1800 * t), 1800) * gate(t, 0.125, 0.07);
  }
  return normalize(out, 0.95);
}

// Escalating beeps: starts slow, gets faster and higher every few seconds.
function escalating(seconds) {
  const out = new Float32Array(RATE * seconds);
  let t = 0;
  while (t < seconds) {
    const stage = Math.min(5, Math.floor(t / 4));
    const freq = 1400 + stage * 250;
    const beep = 0.09;
    const from = Math.floor(t * RATE);
    for (let i = 0; i < beep * RATE && from + i < out.length; i++) {
      const x = i / RATE;
      out[from + i] = square(tau * freq * x, freq) * Math.min(1, x / 0.003, (beep - x) / 0.003);
    }
    t += [0.9, 0.6, 0.4, 0.25, 0.17, 0.12][stage];
  }
  return normalize(out, 0.95);
}

// Foghorn: a huge low horn, two blasts at a time.
function foghorn(seconds) {
  const out = new Float32Array(RATE * seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const x = t % 5;
    const env = x < 1.6 ? Math.min(1, x / 0.08, (1.6 - x) / 0.15) : x >= 2 && x < 3.6 ? Math.min(1, (x - 2) / 0.08, (3.6 - x) / 0.15) : 0;
    const freq = 110 + 3 * Math.sin(tau * 5 * t);
    phase += (tau * freq) / RATE;
    out[i] = softClip(richTone(phase, freq, 30) * 1.8) * env;
  }
  return normalize(out, 0.95);
}

// Reveille: a bugle call, the classic military wake-up.
function reveille(seconds) {
  const out = new Float32Array(RATE * seconds);
  // Bugles only play the harmonic series of one note: G4, C5, E5, G5, C6.
  const G4 = 392, C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;
  const call = [
    [G4, 1], [C5, 1], [E5, 1], [C5, 1], [G4, 1], [C5, 1], [E5, 2], [C5, 2],
    [E5, 1], [C5, 1], [E5, 1], [G5, 1], [E5, 1], [C5, 1], [G4, 2], [C5, 4],
  ];
  const beat = 0.17;
  let t = 0.1;
  while (t < seconds - 3) {
    for (const [f, len] of call) {
      const d = len * beat;
      const from = Math.floor(t * RATE);
      let phase = 0;
      for (let i = 0; i < d * RATE && from + i < out.length; i++) {
        const x = i / RATE;
        phase += (tau * f * (1 + 0.004 * Math.sin(tau * 5.5 * x))) / RATE;
        const env = Math.min(1, x / 0.02, (d - x) / 0.03);
        out[from + i] += softClip(richTone(phase, f, 8) * 1.2) * env;
      }
      t += d;
    }
    t += 0.8;
  }
  void C6;
  return normalize(out, 0.95);
}

// ---- More calm sounds.

/** One-pole filtered noise generators. */
function noise(random) {
  let pinkState = [0, 0, 0];
  let brown = 0;
  return {
    white: () => random() * 2 - 1,
    pink: () => {
      const w = random() * 2 - 1;
      pinkState = [0.99765 * pinkState[0] + w * 0.099046, 0.963 * pinkState[1] + w * 0.2965164, 0.57 * pinkState[2] + w * 1.0526913];
      return pinkState[0] + pinkState[1] + pinkState[2] + w * 0.1848;
    },
    brown: () => {
      brown = (brown + 0.02 * (random() * 2 - 1)) / 1.02;
      return brown * 3.5;
    },
  };
}

// Rain: steady hiss with drops landing on leaves.
function rain(seconds) {
  const out = new Float32Array(RATE * (seconds + 1));
  const random = seededRandom(31);
  const n = noise(random);
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const w = n.pink();
    lp += 0.35 * (w - lp);
    out[i] = (w - lp) * 0.25 + lp * 0.12;
  }
  for (let t = 0; t < seconds + 1; t += 0.004 + random() * 0.03) {
    const from = Math.floor(t * RATE);
    const freq = 1500 + random() * 3500;
    const amp = 0.05 + random() * random() * 0.35;
    for (let i = 0; i < 0.012 * RATE && from + i < out.length; i++) {
      const x = i / RATE;
      out[from + i] += Math.sin(tau * freq * x) * Math.exp(-x * 400) * amp;
    }
  }
  return normalize(loopable(out, 1), 0.7);
}

// Mountain stream: running water with bubbling notes.
function stream(seconds) {
  const out = new Float32Array(RATE * (seconds + 1));
  const random = seededRandom(41);
  const n = noise(random);
  let a = 0;
  let b = 0;
  for (let i = 0; i < out.length; i++) {
    const w = n.white();
    a += 0.25 * (w - a);
    b += 0.05 * (a - b);
    out[i] = (a - b) * 0.6 * (0.7 + 0.3 * Math.sin((i / RATE) * 0.9));
  }
  for (let t = 0; t < seconds + 1; t += 0.01 + random() * 0.05) {
    const from = Math.floor(t * RATE);
    const f0 = 500 + random() * 900;
    const len = 0.02 + random() * 0.04;
    const amp = 0.04 + random() * 0.12;
    let phase = 0;
    for (let i = 0; i < len * RATE && from + i < out.length; i++) {
      const x = i / (len * RATE);
      phase += (tau * f0 * (1 + 0.8 * x)) / RATE;
      out[from + i] += Math.sin(phase) * Math.sin(Math.PI * x) * amp;
    }
  }
  return normalize(loopable(out, 1), 0.7);
}

// Morning forest: a stream, a breeze and birds far away.
function forest(seconds) {
  const water = stream(seconds);
  const song = birds(seconds);
  return normalize(water.map((w, i) => w * 0.5 + (song[i] ?? 0) * 0.6), 0.7);
}

// Pink and brown noise: steady sound with less hiss than white noise.
function pinkNoise(seconds) {
  const random = seededRandom(51);
  const n = noise(random);
  const out = new Float32Array(RATE * (seconds + 1)).map(() => n.pink());
  return normalize(loopable(out, 1), 0.6);
}
function brownNoise(seconds) {
  const random = seededRandom(61);
  const n = noise(random);
  const out = new Float32Array(RATE * (seconds + 1)).map(() => n.brown());
  return normalize(loopable(out, 1), 0.7);
}

// Harp: slow rolling arpeggios on plucked strings.
function harp(seconds) {
  const out = new Float32Array(RATE * seconds);
  const random = seededRandom(71);
  const chords = [
    [48, 55, 60, 64, 67, 72, 76],
    [45, 52, 57, 60, 64, 69, 72],
    [41, 48, 53, 57, 60, 65, 69],
    [43, 50, 55, 59, 62, 67, 71],
  ];
  for (let bar = 0, t = 0.05; t < seconds - 2; bar++) {
    const chord = chords[bar % chords.length];
    const notes = bar % 2 ? [...chord].reverse() : chord;
    for (const note of notes) {
      addPluck(out, t, midi(note), 0.5, { decay: 0.997, bright: 0.35, random });
      t += 0.16;
    }
    t += 1.2;
  }
  return normalize(out, 0.75);
}

// Acoustic guitar: a gentle fingerpicked pattern.
function guitar(seconds) {
  const out = new Float32Array(RATE * seconds);
  const random = seededRandom(81);
  const chords = [
    [40, 52, 55, 59, 64],
    [45, 52, 57, 60, 64],
    [38, 50, 57, 62, 66],
    [43, 50, 55, 59, 67],
  ];
  const pattern = [0, 2, 3, 4, 3, 2, 1, 3];
  for (let bar = 0, t = 0.05; t < seconds - 1; bar++) {
    const chord = chords[bar % chords.length];
    for (const k of pattern) {
      addPluck(out, t, midi(chord[k]), k === 0 ? 0.7 : 0.45, { decay: 0.995, bright: 0.6, random });
      t += 0.28;
    }
  }
  return normalize(out, 0.75);
}

// Soft piano: slow chords and a simple melody.
function softPiano(seconds) {
  const out = new Float32Array(RATE * seconds);
  const piano = (n) => [
    [1, 1, 1.4],
    [2.001, 0.45, 0.9],
    [3.004, 0.18, 0.6],
    [4.01, 0.08, 0.4],
  ].map(([r, a, d]) => [r, a, d * (1.4 - (n - 48) / 80)]);
  const chords = [
    [48, 55, 64],
    [45, 52, 60],
    [41, 48, 57],
    [43, 50, 59],
  ];
  const melody = [76, 74, 72, 74, 72, 69, 72, 71];
  for (let bar = 0, t = 0.05; t < seconds - 2; bar++, t += 2.8) {
    for (const n of chords[bar % 4]) addPartials(out, t, midi(n), 0.35, piano(n), 0.004);
    addPartials(out, t + 0.7, midi(melody[(bar * 2) % 8]), 0.6, piano(melody[(bar * 2) % 8]), 0.004);
    addPartials(out, t + 1.75, midi(melody[(bar * 2 + 1) % 8]), 0.5, piano(melody[(bar * 2 + 1) % 8]), 0.004);
  }
  return normalize(out, 0.75);
}

// Singing bowl: a long, shimmering tone struck every few seconds.
function singingBowl(seconds) {
  const out = new Float32Array(RATE * seconds);
  for (let t = 0.05, k = 0; t < seconds - 1; t += 6, k++) {
    const f = k % 2 ? 196 : 220;
    addPartials(out, t, f, 1, [
      [1, 1, 4],
      [1.004, 0.8, 4],
      [2.71, 0.45, 2.5],
      [2.716, 0.35, 2.5],
      [5.15, 0.2, 1.2],
    ], 0.01);
  }
  return normalize(out, 0.75);
}

// Lo-fi morning: a soft electric-piano loop with a lazy beat.
function lofi(seconds) {
  const out = new Float32Array(RATE * seconds);
  const random = seededRandom(91);
  const chords = [
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [55, 59, 62, 65],
    [52, 55, 59, 62],
  ];
  const beat = 60 / 76;
  for (let bar = 0, t = 0; t < seconds - 1; bar++, t += beat * 4) {
    for (const n of chords[bar % 4]) addPartials(out, t, midi(n), 0.25, [[1, 1, 1.6], [2, 0.2, 0.6], [7, 0.03, 0.05]], 0.01);
    for (let b = 0; b < 4; b++) {
      const at = t + b * beat;
      // Kick on 1 and 3, a soft snare made of noise on 2 and 4.
      const from = Math.floor(at * RATE);
      for (let i = 0; i < 0.25 * RATE && from + i < out.length; i++) {
        const x = i / RATE;
        out[from + i] += b % 2 === 0 ? Math.sin(tau * (50 + 80 * Math.exp(-x * 30)) * x) * Math.exp(-x * 14) * 0.5 : (random() * 2 - 1) * Math.exp(-x * 25) * 0.12;
      }
    }
  }
  return normalize(out, 0.75);
}

mkdirSync(OUT, { recursive: true });
const files = {
  'deep_520hz.wav': deepTone(28),
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
  'calm_wind_chimes.wav': windChimes(28),
  'calm_ocean.wav': ocean(28),
  'calm_sunrise.wav': sunrise(28),
  'calm_music_box.wav': musicBox(28),
  'science_deep_400.wav': deep400(20),
  'science_rising.wav': risingMelody(24),
  'science_rhythmic.wav': rhythmicMelody(19.2),
  'loud_smoke.wav': smokeDetector(20),
  'loud_fire_bell.wav': fireBell(15),
  'loud_phone.wav': phoneRing(18),
  'loud_car.wav': carAlarm(14),
  'loud_klaxon.wav': klaxon(14),
  'loud_red_alert.wav': redAlert(13.2),
  'loud_wail.wav': wail(19.2),
  'loud_hi_lo.wav': hiLo(10),
  'loud_pulse.wav': rapidPulse(10),
  'loud_escalating.wav': escalating(24),
  'loud_foghorn.wav': foghorn(20),
  'loud_reveille.wav': reveille(16),
  'calm_rain.wav': rain(20),
  'calm_stream.wav': stream(20),
  'calm_forest.wav': forest(24),
  'calm_pink_noise.wav': pinkNoise(15),
  'calm_brown_noise.wav': brownNoise(15),
  'calm_harp.wav': harp(22),
  'calm_guitar.wav': guitar(18),
  'calm_piano.wav': softPiano(22.4),
  'calm_singing_bowl.wav': singingBowl(24),
  'calm_lofi.wav': lofi(25.3),
};
for (const [name, samples] of Object.entries(smaller)) {
  writeFileSync(join(OUT, name), wav(samples, RATE));
  console.log(`assets/sounds/${name}  ${(samples.length / RATE).toFixed(1)} s`);
}
