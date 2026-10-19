import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';

import { DEEP_RAMP_SECONDS, DEEP_START_DB, GENTLE_START_DB, fadeVolume } from '@/core/fade';
import { soundAt } from '@/core/plan';
import type { Alarm } from '@/core/types';

export const SOUND_SOURCES = {
  gentle: require('../../assets/sounds/gentle_melody.wav'),
  deep: require('../../assets/sounds/deep_520hz.wav'),
  chime: require('../../assets/sounds/chime.wav'),
};

const VIBRATION = [0, 800, 600];

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
 * up at the right volume and tone.
 */
export function useRingSound(alarm: Alarm | undefined, kind: 'alarm' | 'snooze' | 'recheck' | 'test', startedAt: number, active: boolean) {
  const gentle = useAudioPlayer(SOUND_SOURCES.gentle);
  const deep = useAudioPlayer(SOUND_SOURCES.deep);

  useEffect(() => {
    if (!active || !alarm) return;
    let current: AudioPlayer | null = null;
    let switchedAt = 0;
    setAlarmAudioMode().catch(() => {});
    configure(gentle, { loop: true });
    configure(deep, { loop: true });

    const tick = () => {
      const seconds = Math.max(0, (Date.now() - startedAt) / 1000);
      const want = soundAt(alarm, kind, seconds) === 'deep' ? deep : gentle;
      if (current !== want) {
        current?.pause();
        want.seekTo(0);
        want.play();
        if (Platform.OS === 'android') want.setActiveForLockScreen(true, { title: alarm.label || 'Alarm', artist: 'Ryz' });
        current = want;
        switchedAt = seconds;
      }
      configure(want, {
        volume:
          want === gentle
            ? fadeVolume(seconds, alarm.fadeInSeconds, GENTLE_START_DB)
            : fadeVolume(seconds - switchedAt, DEEP_RAMP_SECONDS, DEEP_START_DB),
      });
    };
    tick();
    const timer = setInterval(tick, 200);
    if (alarm.vibrate) Vibration.vibrate(VIBRATION, true);

    return () => {
      clearInterval(timer);
      Vibration.cancel();
      safely(() => gentle.pause());
      safely(() => deep.pause());
      if (Platform.OS === 'android') safely(() => current?.setActiveForLockScreen(false));
    };
  }, [active, alarm, kind, startedAt, gentle, deep]);
}

/** A short listen in the editor. Plays `seconds` of a sound at full volume. */
export function usePreview() {
  const gentle = useAudioPlayer(SOUND_SOURCES.gentle);
  const deep = useAudioPlayer(SOUND_SOURCES.deep);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    safely(() => gentle.pause());
    safely(() => deep.pause());
  };

  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    play(sound: 'gentle' | 'deep', seconds = 6) {
      stop();
      setAlarmAudioMode().catch(() => {});
      const player = sound === 'gentle' ? gentle : deep;
      configure(player, { volume: 1 });
      player.seekTo(0);
      player.play();
      timer.current = setTimeout(stop, seconds * 1000);
    },
    stop,
  };
}
