import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { makeSum, noRepeats } from '@/core/missions';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/** Sums on a number pad. The answer checks itself once it has enough digits. */
export function MathMission({ mission, onActivity, onDone }: MissionProps) {
  const [solved, setSolved] = useState(0);
  // Never the same sum twice in one mission.
  const [nextSum] = useState(() => noRepeats(() => makeSum(mission.level), (s) => s.text));
  const [sum, setSum] = useState(nextSum);
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (key: string) => {
    onActivity();
    if (key === 'del') {
      setEntry((e) => e.slice(0, -1));
      return;
    }
    const next = entry + key;
    if (next.length < String(sum.answer).length) {
      setEntry(next);
      return;
    }
    if (Number(next) === sum.answer) {
      haptic('light');
      setWrong(false);
      if (solved + 1 >= mission.amount) {
        onDone();
        return;
      }
      setSolved(solved + 1);
      setSum(nextSum());
      setEntry('');
    } else {
      haptic('error');
      setWrong(true);
      setEntry('');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={solved / mission.amount} />
        <Txt variant="caption">{`${solved + 1} of ${mission.amount}`}</Txt>
      </View>
      <View style={styles.problem}>
        <Text style={styles.sum} accessibilityRole="header">{sum.text}</Text>
        <View style={[styles.answer, wrong && styles.answerWrong]}>
          <Text style={[styles.answerText, !entry && styles.placeholder]}>{entry || '?'}</Text>
        </View>
        <Txt variant="caption" style={{ opacity: wrong ? 1 : 0 }}>Not quite — try again</Txt>
      </View>
      <View style={styles.pad}>
        {KEYS.map((key, i) =>
          key ? (
            <Pressable
              key={key}
              onPress={() => press(key)}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Delete' : key}
            >
              {key === 'del' ? <Ionicons name="backspace-outline" size={26} color={colors.text} /> : <Text style={styles.keyText}>{key}</Text>}
            </Pressable>
          ) : (
            <View key={`blank${i}`} style={styles.keyBlank} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', gap: space.lg },
  top: { gap: space.sm },
  problem: { alignItems: 'center', gap: space.md },
  sum: { fontSize: 52, lineHeight: 62, fontFamily: FONT.light, color: colors.text, fontVariant: ['tabular-nums'] },
  answer: {
    minWidth: 140,
    height: 64,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerWrong: { borderColor: colors.danger },
  answerText: { fontSize: 34, lineHeight: 40, fontFamily: FONT.medium, color: colors.text, fontVariant: ['tabular-nums'] },
  placeholder: { color: colors.textFaint },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  key: { width: '31.5%', height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  keyPressed: { backgroundColor: colors.borderStrong },
  keyBlank: { width: '31.5%', height: 64 },
  keyText: { fontSize: 28, lineHeight: 34, fontFamily: FONT.regular, color: colors.text },
});
