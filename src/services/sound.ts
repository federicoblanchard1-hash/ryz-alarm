import { createAudioPlayer, setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Platform, Vibration } from 'react-native';

import { DEEP_RAMP_SECONDS, DEEP_START_DB, GENTLE_START_DB, fadeVolume } from '@/core/fade';
import { phaseAt, soundAt } from '@/core/plan';
import { SLEEP_SOUNDS, sleepSoundVolume, type SleepSoundId } from '@/core/sleep';
import type { Alarm, SoundId } from '@/core/types';
import { patternLength, vibrationPattern, type VibrationId } from '@/core/vibration';

// Metro needs every require() spelled out.
export const SOUND_SOURCES: Record<SoundId, number> = {
  deep: require('../../assets/sounds/deep_520hz.wav'),
  deep_400: require('../../assets/sounds/science_deep_400.wav'),
  gentle: require('../../assets/sounds/gentle_melody.wav'),
  rising: require('../../assets/sounds/science_rising.wav'),
  rhythmic: require('../../assets/sounds/science_rhythmic.wav'),
  air_raid: require('../../assets/sounds/loud_air_raid.wav'),
  wail: require('../../assets/sounds/loud_wail.wav'),
  yelp: require('../../assets/sounds/loud_yelp.wav'),
  two_tone: require('../../assets/sounds/loud_two_tone.wav'),
  hi_lo: require('../../assets/sounds/loud_hi_lo.wav'),
  red_alert: require('../../assets/sounds/loud_red_alert.wav'),
  klaxon: require('../../assets/sounds/loud_klaxon.wav'),
  foghorn: require('../../assets/sounds/loud_foghorn.wav'),
  car: require('../../assets/sounds/loud_car.wav'),
  continuous: require('../../assets/sounds/loud_continuous.wav'),
  pulse: require('../../assets/sounds/loud_pulse.wav'),
  buzzer: require('../../assets/sounds/loud_buzzer.wav'),
  escalating: require('../../assets/sounds/loud_escalating.wav'),
  smoke: require('../../assets/sounds/loud_smoke.wav'),
  bell: require('../../assets/sounds/loud_bell.wav'),
  fire_bell: require('../../assets/sounds/loud_fire_bell.wav'),
  phone: require('../../assets/sounds/loud_phone.wav'),
  reveille: require('../../assets/sounds/loud_reveille.wav'),
  birds: require('../../assets/sounds/calm_birds.wav'),
  forest: require('../../assets/sounds/calm_forest.wav'),
  rain: require('../../assets/sounds/calm_rain.wav'),
  stream: require('../../assets/sounds/calm_stream.wav'),
  ocean: require('../../assets/sounds/calm_ocean.wav'),
  wind_chimes: require('../../assets/sounds/calm_wind_chimes.wav'),
  sunrise: require('../../assets/sounds/calm_sunrise.wav'),
  piano: require('../../assets/sounds/calm_piano.wav'),
  harp: require('../../assets/sounds/calm_harp.wav'),
  guitar: require('../../assets/sounds/calm_guitar.wav'),
  kalimba: require('../../assets/sounds/calm_kalimba.wav'),
  music_box: require('../../assets/sounds/calm_music_box.wav'),
  lofi: require('../../assets/sounds/calm_lofi.wav'),
  singing_bowl: require('../../assets/sounds/calm_singing_bowl.wav'),
  pink_noise: require('../../assets/sounds/calm_pink_noise.wav'),
  brown_noise: require('../../assets/sounds/calm_brown_noise.wav'),
  chime: require('../../assets/sounds/chime.wav'),
};

/** Volume while you're busy with a mission: low enough to think, loud enough to remind you. */
const DUCKED = 0.15;

// expo-audio players are configured by assigning properties.
function configure(player: AudioPlayer, options: { loop?: boolean; volume?: number }) {
  if (options.loop !== undefined) player.loop = options.loop;
  if (options.volume !== undefined) player.volume = options.volume;
}

// On unmount, useAudioPlayer can release a player before our own cleanup runs.
function safely(fn: () => void) {
  try {
    fn();
  } catch {
    // The player is already gone, so it's already silent.
  }
}

async function setAlarmAudioMode() {
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
}

/**
 * Plays an alarm while `active`: the gentle melody fades in and switches to
 * the deep tone if it escalates; the deep tone ramps up over a few seconds.
 * `startedAt` is when the ring began, so reopening the screen mid-ring picks
 * up at the right volume and tone. `ducked` turns it down without restarting
 * it, for while you do a mission.
 */
export function useRingSound(alarm: Alarm | undefined, kind: 'alarm' | 'snooze' | 'recheck' | 'test', startedAt: number, active: boolean, ducked = false) {
  // The alarm's own sound, plus the 520 Hz tone for when a soft alarm escalates (or the melody, for a loud one).
  const own = useAudioPlayer(SOUND_SOURCES[alarm?.sound ?? 'gentle']);
  const deep = useAudioPlayer(SOUND_SOURCES.deep);
  const melody = useAudioPlayer(SOUND_SOURCES.gentle);
  const duckRef = useRef(ducked);
  useEffect(() => {
    duckRef.current = ducked;
  }, [ducked]);

  useEffect(() => {
    if (!active || !alarm) return;
    // An alarm always wins over sleep sounds.
    stopSleepSound();
    let current: AudioPlayer | null = null;
    let switchedAt = 0;
    setAlarmAudioMode().catch(() => {});
    for (const p of [own, deep, melody]) configure(p, { loop: true });
    const players: Partial<Record<SoundId, AudioPlayer>> = { gentle: melody, deep, [alarm.sound]: own };

    const tick = () => {
      const seconds = Math.max(0, (Date.now() - startedAt) / 1000);
      const want = players[soundAt(alarm, kind, seconds)] ?? own;
      if (current !== want) {
        current?.pause();
        want.seekTo(0);
        want.play();
        if (Platform.OS === 'android') want.setActiveForLockScreen(true, { title: alarm.label || 'Alarm', artist: 'Ryz' });
        current = want;
        switchedAt = seconds;
      }
      const volume =
        phaseAt(alarm, kind, seconds) === 'gentle' ? fadeVolume(seconds, alarm.fadeInSeconds, GENTLE_START_DB) : fadeVolume(seconds - switchedAt, DEEP_RAMP_SECONDS, DEEP_START_DB);
      const max = alarm.volume ?? 1;
      configure(want, { volume: (duckRef.current ? volume * DUCKED : volume) * max });
    };
    tick();
    const timer = setInterval(tick, 200);

    return () => {
      clearInterval(timer);
      for (const p of [own, deep, melody]) safely(() => p.pause());
      if (Platform.OS === 'android') safely(() => current?.setActiveForLockScreen(false));
    };
  }, [active, alarm, kind, startedAt, own, deep, melody]);

  // Vibration stops during a mission: it's distracting, and it would count as shakes and squats.
  const vibrate = Boolean(active && alarm?.vibrate && !ducked);
  useEffect(() => {
    if (!vibrate) return;
    Vibration.vibrate(vibrationPattern(alarm?.vibration), true);
    return () => Vibration.cancel();
  }, [vibrate, alarm?.vibration]);
}

/** A short listen in the editor. Plays `seconds` of any sound at the alarm's volume. */
export function usePreview() {
  const player = useAudioPlayer(SOUND_SOURCES.gentle);
  const loaded = useRef<SoundId>('gentle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    safely(() => player.pause());
  };

  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    play(sound: SoundId, seconds = 6, volume = 1) {
      stop();
      setAlarmAudioMode().catch(() => {});
      if (loaded.current !== sound) {
        player.replace(SOUND_SOURCES[sound]);
        loaded.current = sound;
      }
      configure(player, { volume });
      player.seekTo(0);
      player.play();
      timer.current = setTimeout(stop, seconds * 1000);
    },
    /** Change the volume of what's playing, e.g. while a slider moves. */
    setVolume(volume: number) {
      safely(() => configure(player, { volume }));
    },
    stop,
  };
}

/** Buzz a vibration pattern once (twice for short ones), so you can feel it before picking it. */
export function previewVibration(id: VibrationId) {
  const pattern = vibrationPattern(id);
  const once = patternLength(pattern);
  Vibration.cancel();
  Vibration.vibrate(once < 1500 ? [...pattern, ...pattern.slice(1)] : pattern);
}

export function stopVibration() {
  Vibration.cancel();
}

// ---- Sleep sounds: rain, waves or noise to fall asleep to, with a timer.
// One player for the whole app, so it keeps playing when you leave the Sleep tab.

export interface SleepSoundState {
  id: SleepSoundId | null;
  startedAt: number;
  /** 0 plays all night. */
  minutes: number;
  volume: number;
}

let sleepPlayer: AudioPlayer | null = null;
let sleepTimer: ReturnType<typeof setInterval> | null = null;
let sleepState: SleepSoundState = { id: null, startedAt: 0, minutes: 0, volume: 0.6 };
const sleepListeners = new Set<() => void>();
const emitSleep = () => sleepListeners.forEach((l) => l());

/** Plays a sleep sound in a loop; it fades out over its last minute and stops when the timer ends. */
export function startSleepSound(id: SleepSoundId, minutes: number, volume: number) {
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  if (!sleepPlayer) sleepPlayer = createAudioPlayer(SOUND_SOURCES[id]);
  else if (sleepState.id !== id) sleepPlayer.replace(SOUND_SOURCES[id]);
  const player = sleepPlayer;
  configure(player, { loop: true, volume });
  player.play();
  // Android stops background audio after a few minutes without lock screen controls.
  safely(() => player.setActiveForLockScreen(true, { title: SLEEP_SOUNDS.find((s) => s.id === id)?.title ?? 'Sleep sounds', artist: 'Ryz' }));
  sleepState = { id, startedAt: Date.now(), minutes, volume };
  if (sleepTimer) clearInterval(sleepTimer);
  sleepTimer = setInterval(() => {
    const v = sleepSoundVolume(Date.now() - sleepState.startedAt, sleepState.minutes, sleepState.volume);
    if (v <= 0) stopSleepSound();
    else safely(() => configure(player, { volume: v }));
  }, 2000);
  emitSleep();
}

export function stopSleepSound() {
  if (sleepTimer) clearInterval(sleepTimer);
  sleepTimer = null;
  if (sleepPlayer) {
    const player = sleepPlayer;
    safely(() => player.pause());
    safely(() => player.setActiveForLockScreen(false));
  }
  if (sleepState.id !== null) {
    sleepState = { ...sleepState, id: null };
    emitSleep();
  }
}

/** Change the volume of the sleep sound that's playing. */
export function setSleepSoundVolume(volume: number) {
  sleepState = { ...sleepState, volume };
  if (sleepPlayer && sleepState.id) {
    const player = sleepPlayer;
    safely(() => configure(player, { volume: sleepSoundVolume(Date.now() - sleepState.startedAt, sleepState.minutes, volume) }));
  }
  emitSleep();
}

/** What's playing now, for the Sleep screen. */
export function useSleepSound(): SleepSoundState {
  return useSyncExternalStore(
    (l) => {
      sleepListeners.add(l);
      return () => sleepListeners.delete(l);
    },
    () => sleepState,
  );
}
