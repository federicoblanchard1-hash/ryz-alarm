import { describe as conditions, formatTemp, parseForecast, type ForecastResponse } from '../weather';

describe('describe', () => {
  it('maps weather codes to labels, emojis and scenes', () => {
    expect(conditions(0, true)).toEqual({ label: 'Clear', emoji: '☀️', scene: 'clear' });
    expect(conditions(0, false).emoji).toBe('🌙');
    expect(conditions(3, true).scene).toBe('cloudy');
    expect(conditions(63, true).scene).toBe('rain');
    expect(conditions(73, false).scene).toBe('snow');
    expect(conditions(95, true).scene).toBe('storm');
    expect(conditions(45, true).scene).toBe('fog');
  });
});

describe('parseForecast', () => {
  const hour = 3600;
  const base = 1_800_000_000; // a whole hour, in seconds
  const res: ForecastResponse = {
    current: { temperature_2m: 6.4, weather_code: 3, is_day: 1 },
    hourly: {
      time: Array.from({ length: 48 }, (_, i) => base + i * hour),
      temperature_2m: Array.from({ length: 48 }, (_, i) => i),
      weather_code: Array.from({ length: 48 }, () => 2),
      is_day: Array.from({ length: 48 }, (_, i) => (i % 24 > 6 && i % 24 < 19 ? 1 : 0)),
    },
    daily: { temperature_2m_max: [9, 10], temperature_2m_min: [2, 3] },
  };

  it('starts at the current hour and keeps 24 hours', () => {
    const now = (base + 5 * hour + 1200) * 1000; // 5:20 into the forecast
    const w = parseForecast(res, 'Paris', now);
    expect(w.hours).toHaveLength(24);
    expect(w.hours[0].time).toBe((base + 5 * hour) * 1000);
    expect(w.hours[0].temp).toBe(5);
    expect(w).toMatchObject({ place: 'Paris', high: 9, low: 2, current: { temp: 6.4, code: 3, isDay: true } });
  });
});

describe('formatTemp', () => {
  it('rounds and converts', () => {
    expect(formatTemp(6.4, 'C')).toBe('6°');
    expect(formatTemp(-0.4, 'C')).toBe('0°');
    expect(formatTemp(20, 'F')).toBe('68°');
  });
});
