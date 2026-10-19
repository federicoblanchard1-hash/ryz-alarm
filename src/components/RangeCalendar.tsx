import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONT, colors, radius, space } from '@/theme';
import { Txt, haptic } from './ui';

const MONTH = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)));

const dayStart = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * A month calendar for picking a range: tap the first day, then the last.
 * Days after `max` (today) can't be picked.
 */
export function RangeCalendar({ from, to, max, onChange }: { from: number | null; to: number | null; max: number; onChange: (from: number, to: number | null) => void }) {
  const [month, setMonth] = useState(() => {
    const d = new Date(to ?? from ?? max);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  });
  const first = new Date(month);
  const lead = (first.getDay() + 6) % 7; // weeks start on Monday
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1).getTime())];
  const today = dayStart(max);
  const nextMonth = new Date(first.getFullYear(), first.getMonth() + 1, 1).getTime();

  const tap = (day: number) => {
    haptic('select');
    if (from === null || to !== null || day < from) onChange(day, null);
    else onChange(from, day);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={() => setMonth(new Date(first.getFullYear(), first.getMonth() - 1, 1).getTime())} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.nav}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Txt variant="heading">{MONTH.format(month)}</Txt>
        <Pressable onPress={() => setMonth(nextMonth)} disabled={nextMonth > today} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next month" style={[styles.nav, nextMonth > today && styles.disabled]}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>{w}</Text>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`e${i}`} style={styles.cell} />;
          const future = day > today;
          const isEnd = day === from || day === to;
          const inside = from !== null && to !== null && day > from && day < to;
          return (
            <Pressable
              key={day}
              onPress={() => tap(day)}
              disabled={future}
              accessibilityRole="button"
              accessibilityState={{ selected: isEnd || inside, disabled: future }}
              accessibilityLabel={new Date(day).toDateString()}
              style={[styles.cell, inside && styles.inside]}
            >
              <View style={[styles.dayDot, isEnd && styles.dayEnd]}>
                <Text style={[styles.dayText, future && styles.future, isEnd && styles.dayTextEnd]}>{new Date(day).getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="caption" style={styles.hint}>{from === null || to !== null ? 'Tap the first day.' : 'Now tap the last day.'}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, fontFamily: FONT.medium, color: colors.textFaint, paddingBottom: space.xs },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  inside: { backgroundColor: colors.surfaceRaised },
  dayDot: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayEnd: { backgroundColor: colors.accent },
  dayText: { fontSize: 16, fontFamily: FONT.regular, color: colors.text },
  dayTextEnd: { color: colors.onAccent, fontFamily: FONT.semibold },
  future: { color: colors.textFaint },
  hint: { textAlign: 'center' },
});
