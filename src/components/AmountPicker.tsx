import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FONT, colors, radius, space } from '@/theme';
import { Slider } from './Slider';
import { Txt } from './ui';

/**
 * Pick a count from `min` to `max`: drag the slider, or tap the number and
 * type it. The number shows the count live while dragging.
 */
export function AmountPicker({ value, min, max, unit, onChange }: { value: number; min: number; max: number; unit: (n: number) => string; onChange: (n: number) => void }) {
  const [live, setLive] = useState<number | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const span = Math.max(1, max - min);
  const toFraction = (n: number) => (n - min) / span;
  const fromFraction = (f: number) => Math.round(min + f * span);
  const shown = live ?? value;
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));

  const commitTyped = () => {
    const n = Number(typing);
    if (typing !== null && typing.trim() !== '' && Number.isFinite(n)) onChange(clamp(n));
    setTyping(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        {typing !== null ? (
          <TextInput
            value={typing}
            onChangeText={(t) => setTyping(t.replace(/[^0-9]/g, '').slice(0, 3))}
            onBlur={commitTyped}
            onSubmitEditing={commitTyped}
            keyboardType="number-pad"
            returnKeyType="done"
            autoFocus
            selectTextOnFocus
            style={[styles.number, styles.input]}
            accessibilityLabel={`Type a number from ${min} to ${max}`}
          />
        ) : (
          <Pressable onPress={() => setTyping(String(value))} accessibilityRole="button" accessibilityLabel={`${unit(value)}. Tap to type a number`} style={styles.numberBox}>
            <Text style={styles.number}>{shown}</Text>
          </Pressable>
        )}
        <Txt variant="muted">{unit(shown).replace(/^\d+ /, '')}</Txt>
      </View>
      <Slider
        value={toFraction(value)}
        min={0}
        label="How many"
        onSlide={(f) => setLive(fromFraction(f))}
        onChange={(f) => {
          setLive(null);
          onChange(clamp(fromFraction(f)));
        }}
      />
      <View style={styles.ends}>
        <Txt variant="caption">{min}</Txt>
        <Txt variant="caption">Tap the number to type it</Txt>
        <Txt variant="caption">{max}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  numberBox: { minWidth: 72, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center' },
  number: { fontSize: 36, lineHeight: 44, fontFamily: FONT.light, color: colors.text, fontVariant: ['tabular-nums'] },
  input: { minWidth: 72, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.text, textAlign: 'center', paddingVertical: 0 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
