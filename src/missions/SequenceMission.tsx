import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { noRepeats } from '@/core/missions';
import { sequenceProblem } from '@/core/puzzles';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/** What comes next: pick the number that continues the pattern. A wrong pick shows the rule and moves on. */
export function SequenceMission({ mission, onActivity, onDone }: MissionProps) {
  const [next] = useState(() => noRepeats(() => sequenceProblem(mission.level), (p) => p.terms.join(',')));
  const [problem, setProblem] = useState(next);
  const [solved, setSolved] = useState(0);
  const [missed, setMissed] = useState<string | null>(null);

  const pick = (n: number) => {
    onActivity();
    if (n !== problem.answer) {
      haptic('error');
      setMissed(`${problem.rule}, so ${problem.answer}. Here's another.`);
      setProblem(next());
      return;
    }
    haptic('light');
    setMissed(null);
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
      <View style={styles.middle}>
        <Text style={styles.terms} accessibilityLabel={`${problem.terms.join(', ')}, what comes next?`} adjustsFontSizeToFit numberOfLines={2}>
          {problem.terms.join(',  ')}
          <Text style={styles.ask}>,  ?</Text>
        </Text>
        <Txt variant="caption" style={[styles.center, { opacity: missed ? 1 : 0 }]}>{missed ?? ' '}</Txt>
      </View>
      <View style={styles.options}>
        {problem.options.map((o) => (
          <Pressable key={o} onPress={() => pick(o)} accessibilityRole="button" style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
            <Text style={styles.optionText}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', gap: space.lg },
  top: { gap: space.sm },
  middle: { gap: space.md },
  terms: { fontSize: 38, lineHeight: 48, fontFamily: FONT.light, color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  ask: { color: colors.textMuted, fontFamily: FONT.medium },
  center: { textAlign: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  option: { width: '48.5%', height: 72, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.borderStrong },
  optionText: { fontSize: 30, fontFamily: FONT.regular, color: colors.text, fontVariant: ['tabular-nums'] },
});
