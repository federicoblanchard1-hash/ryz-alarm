/** The weather scene drawn behind the forecast. */
export type Scene = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export interface Conditions {
  label: string;
  emoji: string;
  scene: Scene;
}

/** WMO weather codes, as Open-Meteo reports them. */
export function describe(code: number, isDay: boolean): Conditions {
  if (code === 0) return { label: 'Clear', emoji: isDay ? '☀️' : '🌙', scene: 'clear' };
  if (code === 1) return { label: 'Mostly clear', emoji: isDay ? '🌤️' : '🌙', scene: 'clear' };
  if (code === 2) return { label: 'Partly cloudy', emoji: isDay ? '⛅️' : '☁️', scene: 'partly' };
  if (code === 3) return { label: 'Cloudy', emoji: '☁️', scene: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', emoji: '🌫️', scene: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', emoji: isDay ? '🌦️' : '🌧️', scene: 'drizzle' };
  if (code >= 61 && code <= 67) return { label: code >= 65 ? 'Heavy rain' : 'Rain', emoji: '🌧️', scene: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Snow', emoji: '🌨️', scene: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Showers', emoji: isDay ? '🌦️' : '🌧️', scene: 'rain' };
  if (code === 85 || code === 86) return { label: 'Snow showers', emoji: '🌨️', scene: 'snow' };
  if (code >= 95) return { label: 'Thunderstorm', emoji: '⛈️', scene: 'storm' };
  return { label: 'Cloudy', emoji: '☁️', scene: 'cloudy' };
}

export interface Hour {
  /** ms */
  time: number;
  temp: number;
  code: number;
  isDay: boolean;
}

export interface Weather {
  place: string;
  /** All temperatures in °C. */
  current: { temp: number; code: number; isDay: boolean };
  high: number;
  low: number;
  hours: Hour[];
  fetchedAt: number;
}

/** The parts of an Open-Meteo forecast (with `timeformat=unixtime`) that Ryz uses. */
export interface ForecastResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number };
  hourly: { time: number[]; temperature_2m: number[]; weather_code: number[]; is_day: number[] };
  daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
}

/** The next 24 hours, starting with the one we're in, like Apple Weather. */
export function parseForecast(res: ForecastResponse, place: string, now: number): Weather {
  const hours: Hour[] = res.hourly.time.map((t, i) => ({
    time: t * 1000,
    temp: res.hourly.temperature_2m[i],
    code: res.hourly.weather_code[i],
    isDay: res.hourly.is_day[i] === 1,
  }));
  const start = hours.findIndex((h) => h.time + 3_600_000 > now);
  return {
    place,
    current: { temp: res.current.temperature_2m, code: res.current.weather_code, isDay: res.current.is_day === 1 },
    high: res.daily.temperature_2m_max[0],
    low: res.daily.temperature_2m_min[0],
    hours: hours.slice(Math.max(0, start), Math.max(0, start) + 24),
    fetchedAt: now,
  };
}

export function formatTemp(celsius: number, unit: 'C' | 'F'): string {
  const value = unit === 'F' ? celsius * 1.8 + 32 : celsius;
  return `${Math.round(value)}°`;
}

export function forecastUrl(latitude: number, longitude: number): string {
  const params = [
    `latitude=${latitude.toFixed(3)}`,
    `longitude=${longitude.toFixed(3)}`,
    'current=temperature_2m,weather_code,is_day',
    'hourly=temperature_2m,weather_code,is_day',
    'daily=temperature_2m_max,temperature_2m_min',
    'timezone=auto',
    'timeformat=unixtime',
    'forecast_days=2',
  ];
  return `https://api.open-meteo.com/v1/forecast?${params.join('&')}`;
}
