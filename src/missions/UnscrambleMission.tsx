import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { pickWord, scramble } from '@/core/missions';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

function newRound(level: Parameters<typeof pickWord>[0]) {
  const word = pickWord(level);
  return { word, letters: scramble(word).split('') };
}

/** Unscramble: tap the letters in the right order to spell the word. */
export function UnscrambleMission({ mission, onActivity, onDone }: MissionProps) {
  const [solved, setSolved] = useState(0);
  const [round, setRound] = useState(() => newRound(mission.level));
  /** Indexes into round.letters, in the order tapped. */
  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const guess = picked.map((i) => round.letters[i]).join('');

  const tap = (i: number) => {
    onActivity();
    const next = [...picked, i];
    const word = next.map((j) => round.letters[j]).join('');
    if (next.length < round.letters.length) {
      haptic('select');
      setWrong(false);
      setPicked(next);
      return;
    }
    if (word === round.word) {
      haptic('light');
      if (solved + 1 >= mission.amount) {
        onDone();
        return;
      }
      setSolved(solved + 1);
      setRound(newRound(mission.level));
    } else {
      haptic('error');
      setWrong(true);
    }
    setPicked([]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={solved / mission.amount} />
        <Txt variant="caption">{`${solved + 1} of ${mission.amount}`}</Txt>
      </View>
      <View style={styles.answer}>
        <Text style={styles.guess} accessibilityLiveRegion="polite">{guess || ' '}</Text>
        <Pressable onPress={() => setPicked((p) => p.slice(0, -1))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Delete last letter" style={{ opacity: picked.length ? 1 : 0 }}>
          <Ionicons name="backspace-outline" size={26} color={colors.text} />
        </Pressable>
      </View>
      <Txt variant="caption" style={[styles.center, { opacity: wrong ? 1 : 0 }]}>Not a match. Try another order.</Txt>
      <View style={styles.letters}>
        {round.letters.map((letter, i) => {
          const used = picked.includes(i);
          return (
            <Pressable key={i} onPress={() => tap(i)} disabled={used} accessibilityRole="button" accessibilityLabel={letter} style={({ pressed }) => [styles.letter, used && styles.used, pressed && styles.pressed]}>
              <Text style={[styles.letterText, used && styles.usedText]}>{letter}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  answer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, minHeight: 64, borderBottomWidth: 1, borderBottomColor: colors.borderStrong },
  guess: { fontSize: 38, lineHeight: 48, fontFamily: FONT.regular, color: colors.text, letterSpacing: 6 },
  center: { textAlign: 'center' },
  letters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: 'auto' },
  letter: { width: 56, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  used: { backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.borderStrong },
  letterText: { fontSize: 28, fontFamily: FONT.medium, color: colors.text },
  usedText: { color: colors.textFaint },
});
