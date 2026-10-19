import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { describe, formatTemp, type Weather } from '@/core/weather';
import { useStore } from '@/state/store';
import { useWeather } from '@/state/useWeather';
import { colors, radius, space } from '@/theme';
import { Button, Txt } from './ui';
import { WeatherBackdrop } from './WeatherBackdrop';

const HERO_HEIGHT = 430;

function hourLabel(time: number, index: number, use24h: boolean): string {
  if (index === 0) return 'Now';
  const h = new Date(time).getHours();
  if (use24h) return String(h).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'AM' : 'PM'}`;
}

function Hourly({ weather, unit, use24h }: { weather: Weather; unit: 'C' | 'F'; use24h: boolean }) {
  return (
    <View style={styles.panel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours}>
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
    </View>
  );
}

/** Location, temperature and the next 24 hours, over a scene that matches the weather. */
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
      <View style={[styles.content, { paddingTop: insets.top + space.lg }]}>
        {weather && now ? (
          <>
            <Pressable onPress={refresh} accessibilityRole="button" accessibilityLabel={`Weather in ${weather.place}. Tap to refresh`} style={styles.placeRow} hitSlop={10}>
              <Ionicons name="navigate" size={14} color={colors.text} />
              <Text style={styles.place} numberOfLines={1}>{weather.place}</Text>
              {status === 'loading' ? <ActivityIndicator size="small" color={colors.text} /> : null}
            </Pressable>
            <Text style={styles.temp}>{formatTemp(weather.current.temp, tempUnit)}</Text>
            <Text style={styles.condition}>{now.label}</Text>
            <Text style={styles.range}>
              H:{formatTemp(weather.high, tempUnit)}  L:{formatTemp(weather.low, tempUnit)}
            </Text>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.bigEmoji}>{isDay ? '🌤️' : '🌙'}</Text>
            <Txt variant="title" style={styles.center}>{"Today's weather"}</Txt>
            {status === 'loading' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Txt variant="muted" style={styles.center}>
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

const shadow = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingHorizontal: space.xl },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, maxWidth: '90%' },
  place: { fontSize: 22, lineHeight: 28, fontWeight: '600', color: colors.text, ...shadow },
  temp: { fontSize: 104, lineHeight: 116, fontWeight: '200', color: colors.text, marginLeft: 22, ...shadow },
  condition: { fontSize: 20, lineHeight: 26, fontWeight: '500', color: colors.text, ...shadow },
  range: { fontSize: 18, lineHeight: 24, fontWeight: '500', color: colors.text, marginTop: 2, ...shadow },
  empty: { alignItems: 'center', gap: space.md, paddingTop: space.xl },
  bigEmoji: { fontSize: 64, lineHeight: 76 },
  center: { textAlign: 'center' },
  enable: { alignSelf: 'center', marginTop: space.sm },
  panel: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  hours: { paddingHorizontal: space.sm, paddingVertical: space.md },
  hour: { width: 58, alignItems: 'center', gap: space.sm },
  hourLabel: { fontSize: 14, lineHeight: 18, fontWeight: '500', color: colors.text },
  now: { fontWeight: '700' },
  emoji: { fontSize: 24, lineHeight: 30 },
  hourTemp: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.text },
});
