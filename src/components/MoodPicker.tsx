import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOOD, MOODS, type MoodId } from '@/core/mood';
import { FONT, colors, space } from '@/theme';
import { haptic } from './ui';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** A mood's face, in black and white like the rest of Ryz. */
export function MoodIcon({ mood, size = 24, color = colors.text }: { mood: MoodId; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={MOOD[mood].icon as IconName} size={size} color={color} accessibilityLabel={MOOD[mood].label} />;
}

/** A row of mood faces with their names; the chosen one is filled in white. */
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
            style={({ pressed }) => [styles.mood, pressed && styles.pressed]}
          >
            <View style={[styles.face, on && styles.faceOn]}>
              <MoodIcon mood={m.id} size={26} color={on ? colors.onAccent : colors.text} />
            </View>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 },
  mood: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.xs },
  pressed: { opacity: 0.6 },
  face: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  faceOn: { backgroundColor: colors.accent },
  label: { fontSize: 10, fontFamily: FONT.regular, color: colors.textMuted },
  labelOn: { color: colors.text, fontFamily: FONT.medium },
});
