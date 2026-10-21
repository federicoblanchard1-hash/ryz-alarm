import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FONT, colors, radius, space } from '@/theme';
import { Slider } from './Slider';
import { Txt } from './ui';

interface Props {
  value: number;
  min: number;
  max: number;
  /** Values snap to multiples of this (from `min`). */
  step?: number;
  /** "12 minutes": the word after the number comes from here. */
  unit: (n: number) => string;
  onChange: (n: number) => void;
  /** A small heading above, like a chip group's title. */
  title?: string;
  /** Extra words after the unit, e.g. "7 h 30 min" for a sleep goal in minutes. */
  hint?: (n: number) => string | null;
}

/**
 * Pick a number from `min` to `max`: drag the slider, or tap the boxed number
 * and type it. The number shows the value live while dragging.
 */
export function AmountPicker({ value, min, max, step = 1, unit, onChange, title, hint }: Props) {
  const [live, setLive] = useState<number | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const span = Math.max(1, max - min);
  const snap = (n: number) => min + Math.round((n - min) / step) * step;
  const toFraction = (n: number) => (n - min) / span;
  const fromFraction = (f: number) => snap(min + f * span);
  const shown = live ?? value;
  const clamp = (n: number) => Math.min(max, Math.max(min, snap(n)));
  const extra = hint?.(shown);

  const commitTyped = () => {
    const n = Number(typing);
    if (typing !== null && typing.trim() !== '' && Number.isFinite(n)) onChange(clamp(n));
    setTyping(null);
  };

  return (
    <View style={styles.wrap}>
      {title ? <Txt variant="caption">{title}</Txt> : null}
      <View style={styles.top}>
        {typing !== null ? (
          <TextInput
            value={typing}
            onChangeText={(t) => setTyping(t.replace(/[^0-9]/g, '').slice(0, String(max).length))}
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
        <Txt variant="muted" style={styles.unit}>{`${unit(shown).replace(/^\d+ /, '')}${extra ? ` · ${extra}` : ''}`}</Txt>
      </View>
      <Slider
        value={toFraction(value)}
        min={0}
        label={title ?? 'How many'}
        onSlide={(f) => setLive(fromFraction(f))}
        onChange={(f) => {
          setLive(null);
          onChange(clamp(fromFraction(f)));
        }}
      />
      <View style={styles.ends}>
        <Txt variant="caption">{min}</Txt>
        <Txt variant="caption">{max}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  numberBox: { minWidth: 56, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center' },
  number: { fontSize: 24, lineHeight: 32, fontFamily: FONT.light, color: colors.text, fontVariant: ['tabular-nums'] },
  input: { minWidth: 56, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.text, textAlign: 'center', paddingVertical: 0 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  unit: { flexShrink: 1 },
});
