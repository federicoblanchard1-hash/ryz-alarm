import * as Brightness from 'expo-brightness';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Brings the screen up to full brightness over a few seconds while `on`,
 * then hands brightness back. Light right after waking helps clear sleep
 * inertia (Hilditch & McHill, 2019). On web there's nothing to set.
 */
export function useBrightScreen(on: boolean) {
  useEffect(() => {
    if (!on || Platform.OS === 'web') return;
    let cancelled = false;
    let before: number | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    Brightness.getBrightnessAsync()
      .then((start) => {
        if (cancelled) return;
        before = start;
        let step = 0;
        timer = setInterval(() => {
          step += 1;
          const level = start + (1 - start) * Math.min(1, step / 15);
          Brightness.setBrightnessAsync(level).catch(() => {});
          if (step >= 15 && timer) clearInterval(timer);
        }, 200);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (Platform.OS === 'android') Brightness.restoreSystemBrightnessAsync().catch(() => {});
      else if (before !== null) Brightness.setBrightnessAsync(before).catch(() => {});
    };
  }, [on]);
}
