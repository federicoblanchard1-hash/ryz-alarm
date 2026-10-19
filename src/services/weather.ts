import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { forecastUrl, parseForecast, type ForecastResponse, type Weather } from '@/core/weather';

const CACHE_KEY = 'ryz/weather/v1';

export type LocationPermission = 'granted' | 'undetermined' | 'denied';

function toPermission(res: Location.LocationPermissionResponse): LocationPermission {
  return res.granted ? 'granted' : res.canAskAgain ? 'undetermined' : 'denied';
}

export async function getLocationPermission(): Promise<LocationPermission> {
  try {
    return toPermission(await Location.getForegroundPermissionsAsync());
  } catch {
    return 'undetermined';
  }
}

export async function requestLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.requestForegroundPermissionsAsync());
}

async function position(): Promise<{ latitude: number; longitude: number }> {
  if (Platform.OS !== 'web') {
    // A recent fix is enough for weather and comes back instantly.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 }).catch(() => null);
    if (last) return last.coords;
  }
  const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return current.coords;
}

/** The town or city name: the phone's geocoder first, OpenStreetMap's otherwise (and on web). */
async function placeName(latitude: number, longitude: number): Promise<string> {
  if (Platform.OS !== 'web') {
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const name = address?.city || address?.district || address?.subregion || address?.region;
      if (name) return name;
    } catch {
      // Fall through to the web service.
    }
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=en`);
    const { address = {} } = (await res.json()) as { address?: Record<string, string | undefined> };
    return address.city || address.town || address.village || address.municipality || address.county || address.state || 'My location';
  } catch {
    return 'My location';
  }
}

export async function fetchWeather(): Promise<Weather> {
  const { latitude, longitude } = await position();
  const [forecast, place] = await Promise.all([
    fetch(forecastUrl(latitude, longitude)).then((res) => {
      if (!res.ok) throw new Error(`Forecast request failed: ${res.status}`);
      return res.json() as Promise<ForecastResponse>;
    }),
    placeName(latitude, longitude),
  ]);
  const weather = parseForecast(forecast, place, Date.now());
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(weather)).catch(() => {});
  return weather;
}

export async function cachedWeather(): Promise<Weather | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Weather) : null;
  } catch {
    return null;
  }
}
