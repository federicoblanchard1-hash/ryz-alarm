import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { SIGNS, noRepeats, symbolProblem, type Sign } from '@/core/missions';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

const SIGN_NAMES: Record<Sign, string> = { '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divided by' };

/** Missing symbol: which sign makes "12 ? 4 = 48" true? */
export function SymbolMission({ mission, onActivity, onDone }: MissionProps) {
  const [solved, setSolved] = useState(0);
  const [next] = useState(() => noRepeats(() => symbolProblem(mission.level), (p) => `${p.a}${p.sign}${p.b}`));
  const [problem, setProblem] = useState(next);
  const [wrong, setWrong] = useState<Sign | null>(null);

  const pick = (sign: Sign) => {
    onActivity();
    if (sign !== problem.sign) {
      haptic('error');
      setWrong(sign);
      return;
    }
    haptic('light');
    setWrong(null);
    if (solved + 1 >= mission.amount) {
      onDone();
      return;
    }
    setSolved(solved + 1);
    setProblem(next());
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={solved / mission.amount} />
        <Txt variant="caption">{`${solved + 1} of ${mission.amount}`}</Txt>
      </View>
      <Text style={styles.problem} accessibilityLabel={`${problem.a}, what sign, ${problem.b}, equals ${problem.result}`}>
        {problem.a} <Text style={styles.gap}>?</Text> {problem.b} = {problem.result}
      </Text>
      <View style={styles.signs}>
        {SIGNS.map((s) => (
          <Pressable
            key={s}
            onPress={() => pick(s)}
            accessibilityRole="button"
            accessibilityLabel={SIGN_NAMES[s]}
            style={({ pressed }) => [styles.sign, wrong === s && styles.wrong, pressed && styles.pressed]}
          >
            <Text style={styles.signText}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', gap: space.lg },
  top: { gap: space.sm },
  problem: { fontSize: 46, lineHeight: 56, fontFamily: FONT.light, color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  gap: { color: colors.textMuted, fontFamily: FONT.medium },
  signs: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  sign: { flex: 1, aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  wrong: { borderWidth: 2, borderColor: colors.danger },
  pressed: { backgroundColor: colors.borderStrong },
  signText: { fontSize: 40, fontFamily: FONT.light, color: colors.text },
});
