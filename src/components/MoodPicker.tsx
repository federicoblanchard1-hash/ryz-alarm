import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOODS, type MoodId } from '@/core/mood';
import { FONT, colors, radius, space } from '@/theme';
import { haptic } from './ui';

/** A row of mood emojis with their names; the chosen one is highlighted. */
export function MoodPicker({ value, onPick, label }: { value?: MoodId | null; onPick: (mood: MoodId) => void; label: string }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {MOODS.map((m) => {
        const on = value === m.id;
        return (
          <Pressable
            key={m.id}
            onPress={() => {
              haptic('select');
              onPick(m.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={m.label}
            style={({ pressed }) => [styles.mood, on && styles.moodOn, pressed && styles.pressed]}
          >
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 },
  mood: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm, borderRadius: radius.md },
  moodOn: { backgroundColor: colors.surfaceRaised },
  pressed: { opacity: 0.6 },
  emoji: { fontSize: 28, lineHeight: 34 },
  label: { fontSize: 10, fontFamily: FONT.regular, color: colors.textMuted },
  labelOn: { color: colors.text, fontFamily: FONT.medium },
});
