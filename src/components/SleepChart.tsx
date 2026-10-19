import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration, type Bucket } from '@/core/sleep';
import { FONT, colors, space } from '@/theme';

const HEIGHT = 168;
const AXIS = 34;

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
const DAY_NUM = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
const MONTH = new Intl.DateTimeFormat(undefined, { month: 'narrow' });
const SHORT = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const WEEK = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const MONTH_LONG = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export function bucketLabel(b: Bucket): string {
  if (b.size === 'night') return SHORT.format(b.start);
  if (b.size === 'week') return `Week of ${WEEK.format(b.start)}`;
  return MONTH_LONG.format(b.start);
}

function tickLabel(b: Bucket, i: number, count: number): string {
  if (b.size === 'month') return MONTH.format(b.start);
  if (b.size === 'week') return i % 2 === 0 ? WEEK.format(b.start).split(' ')[0] : '';
  if (count <= 14) return WEEKDAY.format(b.start);
  return (count - 1 - i) % 7 === 0 ? DAY_NUM.format(b.start) : '';
}

/**
 * Hours slept as columns from one baseline, with the sleep goal as a
 * labelled line: one per night, or the average per week or month for long
 * ranges. One series, so no legend: the title names it. Tap a column to
 * read it exactly; `onSelect` gets it so the screen can show details.
 */
export function SleepChart({ buckets, goalMinutes, selected, onSelect }: { buckets: Bucket[]; goalMinutes: number; selected: number | null; onSelect: (start: number | null) => void }) {
  const [width, setWidth] = useState(0);
  const most = Math.max(goalMinutes, ...buckets.map((b) => b.minutes ?? 0));
  // A clean top: the next even hour above the longest night or the goal.
  const topHours = Math.max(10, Math.ceil(most / 60 / 2) * 2);
  const ticks = [0, topHours / 2, topHours];
  const y = (minutes: number) => (minutes / 60 / topHours) * HEIGHT;
  const slot = width > 0 ? (width - AXIS) / Math.max(1, buckets.length) : 0;
  const bar = Math.max(3, Math.min(24, slot - (slot > 10 ? 6 : 2)));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height: HEIGHT }}>
        {ticks.map((h) => (
          <View key={h} style={[styles.grid, { bottom: y(h * 60) }]} pointerEvents="none">
            <Text style={styles.tick}>{`${h} h`}</Text>
          </View>
        ))}
        <View style={[styles.goal, { bottom: y(goalMinutes) }]} pointerEvents="none">
          <Text style={styles.goalLabel}>{`Goal ${formatDuration(goalMinutes)}`}</Text>
        </View>
        <View style={[styles.columns, { left: AXIS }]}>
          {buckets.map((b) => {
            const on = selected === b.start;
            const dim = selected !== null && !on;
            const label = bucketLabel(b);
            return (
              <Pressable
                key={b.start}
                onPress={() => b.minutes !== null && onSelect(on ? null : b.start)}
                disabled={b.minutes === null}
                accessibilityRole="button"
                accessibilityLabel={b.minutes !== null ? `${label}: ${formatDuration(b.minutes)}` : `${label}: not logged`}
                accessibilityState={{ selected: on }}
                style={[styles.slot, { width: slot }]}
              >
                {b.minutes !== null ? (
                  <View style={[styles.bar, { width: bar, height: Math.max(4, y(b.minutes)) }, dim && styles.dim]} />
                ) : (
                  <View style={[styles.empty, { width: bar }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={[styles.days, { paddingLeft: AXIS }]}>
        {buckets.map((b, i) => (
          <Text key={b.start} numberOfLines={1} style={[styles.day, { width: slot }, selected === b.start && styles.dayOn]}>
            {tickLabel(b, i, buckets.length)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  tick: { position: 'absolute', left: 0, bottom: 2, fontSize: 11, fontFamily: FONT.regular, color: colors.textFaint },
  goal: { position: 'absolute', left: AXIS, right: 0, height: 1, backgroundColor: colors.textMuted },
  goalLabel: { position: 'absolute', right: 0, bottom: 3, fontSize: 11, fontFamily: FONT.medium, color: colors.textMuted },
  columns: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
  slot: { height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  // Rounded at the data end, square on the baseline.
  bar: { backgroundColor: colors.text, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  dim: { opacity: 0.35 },
  empty: { height: 2, backgroundColor: colors.surfaceRaised },
  days: { flexDirection: 'row', marginTop: space.sm },
  day: { textAlign: 'center', fontSize: 11, fontFamily: FONT.regular, color: colors.textFaint },
  dayOn: { color: colors.text, fontFamily: FONT.semibold },
});
