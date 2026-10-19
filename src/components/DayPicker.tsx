import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAY_LETTERS, WEEK_ORDER, formatDayList } from '@/core/time';
import type { Weekday } from '@/core/types';
import { colors, space } from '@/theme';
import { Checkbox, Txt, haptic } from './ui';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ALL: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** The repeat days as Alarmy lays them out: the list and a Daily box above, a square per day below. */
export function DayPicker({ days, onChange }: { days: Weekday[]; onChange: (days: Weekday[]) => void }) {
  const toggle = (day: Weekday) => {
    haptic('select');
    onChange(days.includes(day) ? days.filter((d) => d !== day) : ([...days, day].sort() as Weekday[]));
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <Txt variant="row" style={styles.list} numberOfLines={1}>{formatDayList(days)}</Txt>
        <Checkbox checked={days.length === 7} onChange={(daily) => onChange(daily ? ALL : [])} label="Every day" />
        <Txt variant="row">Daily</Txt>
      </View>
      <View style={styles.row}>
        {WEEK_ORDER.map((day) => {
          const on = days.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() => toggle(day)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={DAY_NAMES[day]}
              hitSlop={4}
              style={[styles.day, on && styles.on]}
            >
              <Text style={[styles.letter, on && styles.letterOn]}>{DAY_LETTERS[day]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
  list: { flex: 1, color: colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.accent },
  letter: { fontSize: 17, fontWeight: '600', color: colors.textFaint },
  letterOn: { color: colors.onAccent },
});
