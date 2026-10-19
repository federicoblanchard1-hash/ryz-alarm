import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';

import { DEEP_RAMP_SECONDS, DEEP_START_DB, GENTLE_START_DB, fadeVolume } from '@/core/fade';
import { phaseAt, soundAt } from '@/core/plan';
import type { Alarm, SoundId } from '@/core/types';

// Metro needs every require() spelled out.
export const SOUND_SOURCES: Record<SoundId, number> = {
  gentle: require('../../assets/sounds/gentle_melody.wav'),
  deep: require('../../assets/sounds/deep_520hz.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  air_raid: require('../../assets/sounds/loud_air_raid.wav'),
  yelp: require('../../assets/sounds/loud_yelp.wav'),
  two_tone: require('../../assets/sounds/loud_two_tone.wav'),
  buzzer: require('../../assets/sounds/loud_buzzer.wav'),
  bell: require('../../assets/sounds/loud_bell.wav'),
  wind_chimes: require('../../assets/sounds/calm_wind_chimes.wav'),
  ocean: require('../../assets/sounds/calm_ocean.wav'),
  birds: require('../../assets/sounds/calm_birds.wav'),
  sunrise: require('../../assets/sounds/calm_sunrise.wav'),
  music_box: require('../../assets/sounds/calm_music_box.wav'),
};

const VIBRATION = [0, 800, 600];
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
    Vibration.vibrate(VIBRATION, true);
    return () => Vibration.cancel();
  }, [vibrate]);
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
    stop,
  };
}
