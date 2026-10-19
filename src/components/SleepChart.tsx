import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration, minutesAsleep } from '@/core/sleep';
import type { SleepRecord } from '@/core/types';
import { FONT, colors, space } from '@/theme';

const HEIGHT = 168;
const AXIS = 34;

interface Slot {
  day: number;
  record: SleepRecord | null;
}

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
const SHORT = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * Hours slept per night as columns from one baseline, with the sleep goal
 * as a labelled line. One series, so no legend: the title names it. Tap a
 * night to read it exactly; `onSelect` gets it so the screen can show details.
 */
export function SleepChart({ slots, goalMinutes, selected, onSelect }: { slots: Slot[]; goalMinutes: number; selected: number | null; onSelect: (day: number | null) => void }) {
  const [width, setWidth] = useState(0);
  const most = Math.max(goalMinutes, ...slots.map((s) => (s.record ? minutesAsleep(s.record) : 0)));
  // A clean top: the next even hour above the longest night or the goal.
  const topHours = Math.max(10, Math.ceil(most / 60 / 2) * 2);
  const ticks = [0, topHours / 2, topHours];
  const y = (minutes: number) => (minutes / 60 / topHours) * HEIGHT;
  const slot = width > 0 ? (width - AXIS) / slots.length : 0;
  const bar = Math.max(4, Math.min(24, slot - 6));
  const labelEvery = slots.length > 14 ? 7 : 1;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="Hours slept each night" accessible={false}>
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
          {slots.map((s) => {
            const minutes = s.record ? minutesAsleep(s.record) : 0;
            const on = selected === s.day;
            const dim = selected !== null && !on;
            const date = SHORT.format(s.day);
            return (
              <Pressable
                key={s.day}
                onPress={() => s.record && onSelect(on ? null : s.day)}
                disabled={!s.record}
                accessibilityRole="button"
                accessibilityLabel={s.record ? `${date}: ${formatDuration(minutes)}` : `${date}: not logged`}
                accessibilityState={{ selected: on }}
                style={[styles.slot, { width: slot }]}
              >
                {s.record ? (
                  <View style={[styles.bar, { width: bar, height: Math.max(4, y(minutes)) }, dim && styles.dim]} />
                ) : (
                  <View style={[styles.empty, { width: bar }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={[styles.days, { paddingLeft: AXIS }]}>
        {slots.map((s, i) => (
          <Text key={s.day} style={[styles.day, { width: slot }, selected === s.day && styles.dayOn]}>
            {(slots.length - 1 - i) % labelEvery === 0 ? WEEKDAY.format(s.day) : ''}
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
