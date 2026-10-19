import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { describe, formatTemp, type Scene, type Weather } from '@/core/weather';
import { useStore } from '@/state/store';
import { useWeather } from '@/state/useWeather';
import { colors, space } from '@/theme';
import { Button, Txt, type IconName } from './ui';
import { WeatherBackdrop } from './WeatherBackdrop';

/** White weather glyphs instead of emojis, so the screen stays black and white. */
export function weatherIcon(scene: Scene, isDay: boolean): IconName {
  switch (scene) {
    case 'clear':
      return isDay ? 'sunny' : 'moon';
    case 'partly':
      return isDay ? 'partly-sunny' : 'cloudy-night';
    case 'drizzle':
    case 'rain':
      return 'rainy';
    case 'snow':
      return 'snow';
    case 'storm':
      return 'thunderstorm';
    default:
      return 'cloudy';
  }
}

function hourLabel(time: number, use24h: boolean): string {
  const h = new Date(time).getHours();
  if (use24h) return String(h).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'AM' : 'PM'}`;
}

/** The next 24 hours straight on the scene: hour, glyph, temperature. */
function Hourly({ weather, unit, use24h }: { weather: Weather; unit: 'C' | 'F'; use24h: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours} style={styles.hourStrip}>
      {weather.hours.map((h) => {
        const c = describe(h.code, h.isDay);
        return (
          <View key={h.time} style={styles.hour} accessible accessibilityLabel={`${hourLabel(h.time, use24h)}, ${c.label}, ${formatTemp(h.temp, unit)}`}>
            <Text style={styles.hourLabel}>{hourLabel(h.time, use24h)}</Text>
            <Ionicons name={weatherIcon(c.scene, h.isDay)} size={30} color={colors.text} />
            <Text style={styles.hourTemp}>{formatTemp(h.temp, unit)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

/**
 * Alarmy's morning layout: the town, the temperature big on the left,
 * conditions and high/low on the right, the hours below, then `children`
 * (the shortcut tiles), all over a scene that matches the weather.
 */
export function WeatherHero({ children }: { children?: ReactNode }) {
  const { weather, status, enable, refresh } = useWeather();
  const { data } = useStore();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(560 + insets.top);
  const { tempUnit, use24h } = data.settings;
  const hour = new Date().getHours();
  const isDay = weather ? weather.current.isDay : hour >= 7 && hour < 19;
  const now = weather ? describe(weather.current.code, weather.current.isDay) : null;

  return (
    <View onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}>
      <WeatherBackdrop scene={now?.scene ?? 'clear'} isDay={isDay} height={height} />
      <View style={[styles.content, { paddingTop: insets.top + space.xl }]}>
        {weather && now ? (
          <>
            <Pressable onPress={refresh} accessibilityRole="button" accessibilityLabel={`Weather in ${weather.place}. Tap to refresh`} style={styles.placeRow} hitSlop={10}>
              <Text style={styles.place} numberOfLines={1}>{weather.place}</Text>
              {status === 'loading' ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="chevron-forward" size={22} color={colors.text} />}
            </Pressable>
            <View style={styles.main}>
              <Text style={styles.temp}>{formatTemp(weather.current.temp, tempUnit)}</Text>
              <View style={styles.side}>
                <View style={styles.conditionRow}>
                  <Text style={styles.condition}>{now.label}</Text>
                  <Ionicons name={weatherIcon(now.scene, weather.current.isDay)} size={26} color={colors.text} />
                </View>
                <Text style={styles.range}>{`high ${formatTemp(weather.high, tempUnit)} | low ${formatTemp(weather.low, tempUnit)}`}</Text>
              </View>
            </View>
            <Hourly weather={weather} unit={tempUnit} use24h={use24h} />
          </>
        ) : (
          <View style={styles.empty}>
            {status === 'loading' ? (
              <ActivityIndicator color={colors.text} style={styles.loading} />
            ) : (
              <>
                <Text style={styles.place}>{"Today's weather"}</Text>
                <Txt variant="muted">
                  {status === 'denied'
                    ? 'Location is off for Ryz. Turn it on in Settings to see the weather where you wake up.'
                    : status === 'error'
                      ? "Couldn't load the weather. Check your connection."
                      : 'See the weather where you wake up, hour by hour.'}
                </Txt>
                <Button
                  title={status === 'denied' ? 'Open Settings' : status === 'error' ? 'Try again' : 'Use my location'}
                  icon={status === 'error' ? 'refresh' : 'navigate'}
                  variant="outline"
                  onPress={status === 'error' ? refresh : enable}
                  style={styles.enable}
                />
              </>
            )}
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, alignSelf: 'flex-start', maxWidth: '90%' },
  place: { fontSize: 21, lineHeight: 28, fontWeight: '500', color: colors.text, ...shadow },
  main: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  temp: { fontSize: 46, lineHeight: 54, fontWeight: '600', color: colors.text, ...shadow },
  side: { alignItems: 'flex-end', paddingTop: space.xs, flexShrink: 1 },
  conditionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  condition: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: colors.text, textAlign: 'right', ...shadow },
  range: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: colors.text, ...shadow },
  empty: { gap: space.md, paddingBottom: space.lg, alignItems: 'flex-start' },
  loading: { alignSelf: 'flex-start', marginVertical: space.xxl },
  enable: { marginTop: space.sm },
  hourStrip: { marginTop: space.xl, marginHorizontal: -space.xl },
  hours: { paddingHorizontal: space.lg },
  hour: { width: 49, alignItems: 'center', gap: space.sm },
  hourLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: 1, color: colors.text, opacity: 0.75 },
  hourTemp: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.text },
});
