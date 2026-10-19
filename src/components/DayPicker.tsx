import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAY_LETTERS, WEEK_ORDER, formatDays } from '@/core/time';
import type { Weekday } from '@/core/types';
import { colors, radius, space } from '@/theme';
import { Txt, haptic } from './ui';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DayPicker({ days, onChange }: { days: Weekday[]; onChange: (days: Weekday[]) => void }) {
  const toggle = (day: Weekday) => {
    haptic('select');
    onChange(days.includes(day) ? days.filter((d) => d !== day) : ([...days, day].sort() as Weekday[]));
  };
  return (
    <View style={styles.wrap}>
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
      <Txt variant="caption">{days.length === 0 ? 'Once — rings the next time this time comes round' : formatDays(days)}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, paddingVertical: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.accent, borderColor: colors.accent },
  letter: { fontSize: 15, fontWeight: '600', color: colors.text },
  letterOn: { color: colors.onAccent },
});
