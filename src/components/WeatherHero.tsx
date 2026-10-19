import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { describe, formatTemp, type Weather } from '@/core/weather';
import { useStore } from '@/state/store';
import { useWeather } from '@/state/useWeather';
import { colors, space } from '@/theme';
import { Button, Txt } from './ui';
import { WeatherBackdrop } from './WeatherBackdrop';

const HERO_HEIGHT = 400;

function hourLabel(time: number, index: number, use24h: boolean): string {
  if (index === 0) return 'Now';
  const h = new Date(time).getHours();
  if (use24h) return String(h).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;
}

function greeting(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The next 24 hours straight on the scene, no panel: label, emoji, temperature. */
function Hourly({ weather, unit, use24h }: { weather: Weather; unit: 'C' | 'F'; use24h: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours} style={styles.hourStrip}>
      {weather.hours.map((h, i) => {
        const c = describe(h.code, h.isDay);
        return (
          <View key={h.time} style={styles.hour} accessible accessibilityLabel={`${hourLabel(h.time, i, use24h)}, ${c.label}, ${formatTemp(h.temp, unit)}`}>
            <Text style={[styles.hourLabel, i === 0 && styles.now]}>{hourLabel(h.time, i, use24h)}</Text>
            <Text style={styles.emoji}>{c.emoji}</Text>
            <Text style={styles.hourTemp}>{formatTemp(h.temp, unit)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

/** Greeting and town on top, the temperature big on the left, conditions on the right, hours below. */
export function WeatherHero() {
  const { weather, status, enable, refresh } = useWeather();
  const { data } = useStore();
  const insets = useSafeAreaInsets();
  const { tempUnit, use24h } = data.settings;
  const hour = new Date().getHours();
  const isDay = weather ? weather.current.isDay : hour >= 7 && hour < 19;
  const now = weather ? describe(weather.current.code, weather.current.isDay) : null;
  const height = HERO_HEIGHT + insets.top;

  return (
    <View style={{ height }}>
      <WeatherBackdrop scene={now?.scene ?? 'clear'} isDay={isDay} height={height} />
      <View style={[styles.content, { paddingTop: insets.top + space.md }]}>
        <Text style={styles.greeting} accessibilityRole="header">{greeting(hour)}</Text>
        {weather && now ? (
          <>
            <Pressable onPress={refresh} accessibilityRole="button" accessibilityLabel={`Weather in ${weather.place}. Tap to refresh`} style={styles.placeRow} hitSlop={10}>
              <Text style={styles.place} numberOfLines={1}>{weather.place}</Text>
              {status === 'loading' ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="chevron-forward" size={18} color={colors.text} />}
            </Pressable>
            <View style={styles.main}>
              <Text style={styles.temp} accessibilityLabel={`${formatTemp(weather.current.temp, tempUnit)}, ${now.label}`}>
                {formatTemp(weather.current.temp, tempUnit)}
              </Text>
              <View style={styles.side}>
                <Text style={styles.bigEmoji}>{now.emoji}</Text>
                <Text style={styles.condition}>{now.label}</Text>
                <Text style={styles.range}>{`High ${formatTemp(weather.high, tempUnit)}  |  Low ${formatTemp(weather.low, tempUnit)}`}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            {status === 'loading' ? (
              <ActivityIndicator color={colors.text} style={styles.loading} />
            ) : (
              <>
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
      {weather ? <Hourly weather={weather} unit={tempUnit} use24h={use24h} /> : null}
    </View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl },
  greeting: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: colors.text, letterSpacing: -0.8, ...shadow },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, alignSelf: 'flex-start', maxWidth: '90%', marginTop: space.xs },
  place: { fontSize: 17, lineHeight: 22, fontWeight: '500', color: colors.text, ...shadow },
  main: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.xl, gap: space.md },
  temp: { fontSize: 96, lineHeight: 104, fontWeight: '200', color: colors.text, letterSpacing: -4, ...shadow },
  side: { alignItems: 'flex-end', paddingBottom: space.md, gap: 2, flexShrink: 1 },
  bigEmoji: { fontSize: 34, lineHeight: 42 },
  condition: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: colors.text, textAlign: 'right', ...shadow },
  range: { fontSize: 14, lineHeight: 20, fontWeight: '500', color: colors.text, opacity: 0.85, ...shadow },
  empty: { gap: space.md, paddingTop: space.xl, alignItems: 'flex-start' },
  loading: { alignSelf: 'flex-start' },
  enable: { marginTop: space.sm },
  hourStrip: { position: 'absolute', left: 0, right: 0, bottom: space.lg },
  hours: { paddingHorizontal: space.lg, paddingTop: space.md, gap: 2 },
  hour: { width: 56, alignItems: 'center', gap: space.sm },
  hourLabel: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: colors.textMuted },
  now: { fontWeight: '700', color: colors.text },
  emoji: { fontSize: 24, lineHeight: 30 },
  hourTemp: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: colors.text },
});
