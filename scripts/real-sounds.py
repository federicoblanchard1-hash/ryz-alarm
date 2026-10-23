"""Builds six alarm sounds from real recordings: trimmed, looped to 28 s (alarms re-send their
sound every 30 s, and iOS plays at most 30 s) and brought to a set loudness.

The recordings are from BigSoundBank (https://bigsoundbank.com) by Joseph Sardin, all CC0
(public domain): free for commercial use, no credit required. Download each from its page and
save it in one folder under its sound number, e.g. 1375.flac or 195.ogg (any format ffmpeg reads):

  gentle_melody.wav    0195  The music box "Temps des cerises"     /the-music-box-temps-des-cerises-s0195.html
  calm_birds.wav       0222  Birds Waking #1                       /awakening-birds-s0222.html
  calm_kalimba.wav     0470  Sanza (instrument)                    /sanza-instrument-s0470.html
  loud_buzzer.wav      0035  Electronic Alarm (Buzzer) #1          /electronic-alarm-buzzer-1-s0035.html
  loud_bell.wav        1375  Mechanical alarm clock, long ring #2  /mechanical-alarm-clock-long-ring-2-s1375.html
  loud_continuous.wav  1996  Piezo alarm #3                        /piezo-alarm-3-s1996.html

Needs ffmpeg and numpy. Run from the repo root: python3 scripts/real-sounds.py <folder>
"""
import subprocess, sys, wave
from pathlib import Path

import numpy as np

SRC = sys.argv[1]
OUT = str(Path(__file__).resolve().parent.parent / "assets" / "sounds")

def load(number, rate, extra=""):
    """The recording saved under `number`, in whichever format decodes (a failed download is skipped)."""
    for path in sorted(p for p in Path(SRC).iterdir() if p.stem.lstrip("0") == str(number)):
        args = ["ffmpeg", "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", str(rate)]
        if extra: args += ["-af", extra]
        raw = subprocess.run(args + ["-f", "f32le", "-"], capture_output=True).stdout
        if raw:
            return np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    sys.exit(f"No audio file for sound {number} in {SRC}")

def rms_env(x, r, win=0.05):
    n = int(r * win)
    return np.array([np.sqrt(np.mean(x[i:i + n] ** 2)) for i in range(0, len(x) - n, n)]), n

def xfade(a, b, r, sec):
    n = int(r * sec)
    t = np.linspace(0, np.pi / 2, n)
    return np.concatenate([a[:-n], a[-n:] * np.cos(t) + b[:n] * np.sin(t), b[n:]])

def fade(x, r, inn=0.0, out=0.0):
    x = x.copy()
    if inn: k = int(r * inn); x[:k] *= np.linspace(0, 1, k)
    if out: k = int(r * out); x[-k:] *= np.linspace(1, 0, k)
    return x

def loop_to(seg, r, seconds, cross):
    out = seg
    while len(out) < seconds * r: out = xfade(out, seg, r, cross)
    return out[: int(seconds * r)]

def lufs(path):
    out = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(out.split("Integrated loudness:")[1].split("I:")[1].split("LUFS")[0])

def save(name, x, r, target):
    """Raised with a limiter until it reaches the target loudness (LUFS), peaks held under -1.5 dBFS.
    Real recordings have quiet gaps and sharp peaks, so plain normalising leaves them much quieter
    than a synthesised tone."""
    tmp = f"{OUT}/_raw.wav"
    w = wave.open(tmp, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(r)
    w.writeframes((np.clip(x / (np.abs(x).max() + 1e-12) * 0.84, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    dest = f"{OUT}/{name}"
    for gain in np.arange(0, 24.5, 0.5):
        subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-i", tmp, "-af", f"volume={gain}dB,alimiter=limit=0.84:attack=2:release=40:level=false", "-ar", str(r), "-ac", "1", "-c:a", "pcm_s16le", dest], check=True)
        level = lufs(dest)
        if level >= target:
            break
    w = wave.open(dest); y = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16) / 32768
    print(f"{name:20} {len(y)/r:5.1f}s  +{gain:4.1f} dB  {level:6.1f} LUFS (target {target})  peak {20*np.log10(np.abs(y).max()):5.1f} dBFS")

# Loud sounds as loud as they can be without clipping; calm ones well below, as they fade in anyway.
LOUDNESS = {"loud_buzzer.wav": -30,  # left as recorded: its beeps already reach full scale, and more gain fills in the gaps between them
            "loud_continuous.wav": -4, "loud_bell.wav": -8, "gentle_melody.wav": -15, "calm_kalimba.wav": -18, "calm_birds.wav": -13}

def build(name, x, r):
    save(name, x, r, LOUDNESS[name])

# Digital buzzer: the beep-beep-beep pattern, cut at a silent gap and repeated to 28 s.
r = 16000; x = load(35, r)
env, n = rms_env(x, r); quiet = env < env.max() * 0.1
# Cut where a beep starts after a gap, so the loop keeps the gap between beeps.
onsets = [i * n for i in range(6, len(env)) if not quiet[i] and quiet[i - 6:i].all()]
seg = x[: onsets[-1]] if onsets else x
out = seg
while len(out) < 28 * r: out = np.concatenate([out, seg])
build("loud_buzzer.wav", out[: 28 * r], r)

# Continuous tone: the steady part of the piezo alarm, crossfaded into a 28 s loop.
r = 16000; x = load(1996, r)
build("loud_continuous.wav", fade(loop_to(x[int(0.3 * r): int(13.4 * r)], r, 28, 0.25), r, 0.01, 0.05), r)

# Alarm clock bell: the bell's ringing, looped, then its own wind-down at the end.
r = 16000; x = load(1375, r)
ring = x[int(0.15 * r): int(10.3 * r)]
tail = x[int(10.3 * r):]
body = loop_to(ring, r, 28 - len(tail) / r + 0.15, 0.12)
build("loud_bell.wav", xfade(body, tail, r, 0.15), r)

# Gentle melody: the music box tune, then it starts again and fades out.
r = 22050; x = load(195, r, "highpass=f=120")
tune = x[: int(17.6 * r)]
build("gentle_melody.wav", fade(xfade(tune, tune, r, 0.05)[: 28 * r], r, 0.02, 2.5), r)

# Kalimba: the liveliest 28 s of the sanza recording, starting on a note.
r = 16000; x = load(470, r, "highpass=f=60")
env, n = rms_env(x, r, 0.1)
win = int(28 / 0.1)
starts = [i for i in range(1, len(env) - win) if env[i] > env[i - 1] * 2]
best = max(starts, key=lambda i: env[i:i + win].mean())
build("calm_kalimba.wav", fade(x[best * n: best * n + 28 * r], r, 0.01, 1.5), r)

# Birdsong: the busiest 28 s of the dawn chorus, low rumble filtered out.
r = 16000; x = load(222, r, "highpass=f=300")
env, n = rms_env(x, r, 0.25)
win = int(28 / 0.25)
best = max(range(len(env) - win), key=lambda i: np.median(env[i:i + win]))
build("calm_birds.wav", fade(x[best * n: best * n + 28 * r], r, 0.8, 1.5), r)
Path(f"{OUT}/_raw.wav").unlink(missing_ok=True)
