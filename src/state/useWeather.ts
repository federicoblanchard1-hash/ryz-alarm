import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { MINUTE } from '@/core/time';
import type { Weather } from '@/core/weather';
import { cachedWeather, fetchWeather, getLocationPermission, requestLocationPermission, type LocationPermission } from '@/services/weather';

/** Older than this, the forecast is fetched again when the app opens. */
const FRESH_FOR = 15 * MINUTE;

export type WeatherStatus = 'loading' | 'ready' | 'needs-permission' | 'denied' | 'error';

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('loading');
  const latest = useRef<Weather | null>(null);

  const load = useCallback(async (force: boolean) => {
    const permission: LocationPermission = await getLocationPermission();
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'denied' : 'needs-permission');
      return;
    }
    if (!force && latest.current && Date.now() - latest.current.fetchedAt < FRESH_FOR) {
      setStatus('ready');
      return;
    }
    try {
      const fresh = await fetchWeather();
      latest.current = fresh;
      setWeather(fresh);
      setStatus('ready');
    } catch {
      // Keep showing the last forecast if there is one.
      setStatus(latest.current ? 'ready' : 'error');
    }
  }, []);

  useEffect(() => {
    cachedWeather().then((cached) => {
      if (cached && !latest.current) {
        latest.current = cached;
        setWeather(cached);
      }
      load(false);
    });
    const sub = AppState.addEventListener('change', (state) => state === 'active' && load(false));
    return () => sub.remove();
  }, [load]);

  /** Asks for location if the system still lets us, otherwise opens Settings. */
  const enable = useCallback(async () => {
    if (status === 'denied') {
      await Linking.openSettings();
      return;
    }
    setStatus('loading');
    const permission = await requestLocationPermission().catch(() => 'denied' as const);
    if (permission === 'granted') load(true);
    else setStatus(permission === 'denied' ? 'denied' : 'needs-permission');
  }, [status, load]);

  const refresh = useCallback(() => load(true), [load]);

  return { weather, status, enable, refresh };
}
