import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { DSST_SECONDS, DSST_SYMBOLS, dsstKey, type DsstSymbol } from '@/core/puzzles';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

function pickSymbol(not?: DsstSymbol): DsstSymbol {
  const choices = DSST_SYMBOLS.filter((s) => s !== not);
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Symbol code, after the digit symbol substitution test: the key at the top
 * pairs each symbol with a number; tap the number for the symbol shown before
 * its time runs out.
 */
export function DsstMission({ mission, onActivity, onDone }: MissionProps) {
  const [key] = useState(() => dsstKey());
  const [symbol, setSymbol] = useState<DsstSymbol>(() => pickSymbol());
  const [right, setRight] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seconds = DSST_SECONDS[mission.level];

  // Each symbol has a few seconds; when they run out, a new one comes.
  useEffect(() => {
    timer.current = setTimeout(() => {
      setNote('Too slow. Here’s a new one.');
      setSymbol((s) => pickSymbol(s));
    }, seconds * 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [symbol, right, seconds]);

  const press = (digit: number) => {
    onActivity();
    if (key[symbol] !== digit) {
      haptic('error');
      setNote(`That was ${key[symbol]}.`);
      setSymbol(pickSymbol(symbol));
      return;
    }
    haptic('light');
    setNote(null);
    if (right + 1 >= mission.amount) {
      onDone();
      return;
    }
    setRight(right + 1);
    setSymbol(pickSymbol(symbol));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={right / mission.amount} />
        <Txt variant="caption">{`${right} of ${mission.amount} · ${seconds} s each`}</Txt>
      </View>
      <View style={styles.key} accessibilityLabel="The key">
        {DSST_SYMBOLS.map((s) => (
          <View key={s} style={styles.pair}>
            <Ionicons name={s} size={20} color={colors.text} />
            <Text style={styles.pairDigit}>{key[s]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.middle}>
        <Ionicons name={symbol} size={96} color={colors.text} accessibilityLabel={symbol} />
        <Txt variant="caption" style={[styles.center, { opacity: note ? 1 : 0 }]}>{note ?? ' '}</Txt>
      </View>
      <View style={styles.pad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <Pressable key={d} onPress={() => press(d)} accessibilityRole="button" style={({ pressed }) => [styles.digit, pressed && styles.pressed]}>
            <Text style={styles.digitText}>{d}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  top: { gap: space.sm },
  key: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.sm, paddingHorizontal: space.xs, borderRadius: radius.md, backgroundColor: colors.surface },
  pair: { alignItems: 'center', gap: 4 },
  pairDigit: { fontSize: 16, fontFamily: FONT.medium, color: colors.text },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  center: { textAlign: 'center' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  digit: { width: '31.5%', height: 60, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.borderStrong },
  digitText: { fontSize: 26, fontFamily: FONT.regular, color: colors.text },
});
