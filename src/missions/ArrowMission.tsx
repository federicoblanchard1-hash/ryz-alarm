import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { ARROW_SECONDS, arrowTrial, type Side } from '@/core/missions';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/**
 * Arrow test, a spatial Stroop task: answer where the arrow points and ignore
 * the word, which often says the opposite. A wrong or late answer doesn't count.
 */
export function ArrowMission({ mission, onActivity, onDone }: MissionProps) {
  const [count, setCount] = useState(0);
  const [trial, setTrial] = useState(() => arrowTrial(mission.level));
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seconds = ARROW_SECONDS[mission.level];

  const nextTrial = (message: string | null) => {
    setFeedback(message);
    setTrial(arrowTrial(mission.level));
  };

  useEffect(() => {
    timer.current = setTimeout(() => {
      haptic('error');
      nextTrial('Too slow');
    }, seconds * 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [trial]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (side: Side) => {
    onActivity();
    if (timer.current) clearTimeout(timer.current);
    if (side !== trial.arrow) {
      haptic('error');
      nextTrial('Follow the arrow, not the word');
      return;
    }
    haptic('light');
    if (count + 1 >= mission.amount) {
      onDone();
      return;
    }
    setCount(count + 1);
    nextTrial(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={count / mission.amount} />
        <Txt variant="caption">{`${count} of ${mission.amount} · ${seconds} s each`}</Txt>
      </View>
      <View style={styles.stage} accessible accessibilityLabel={`Arrow points ${trial.arrow}. Word says ${trial.word}`}>
        <Ionicons name={trial.arrow === 'left' ? 'arrow-back' : 'arrow-forward'} size={120} color={colors.text} />
        <Text style={styles.word}>{trial.word.toUpperCase()}</Text>
      </View>
      <Txt variant="caption" style={[styles.center, { opacity: feedback ? 1 : 0 }]}>{feedback ?? ' '}</Txt>
      <View style={styles.buttons}>
        {(['left', 'right'] as const).map((side) => (
          <Pressable key={side} onPressIn={() => answer(side)} accessibilityRole="button" accessibilityLabel={side} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Ionicons name={side === 'left' ? 'chevron-back' : 'chevron-forward'} size={34} color={colors.text} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  word: { fontSize: 30, fontFamily: FONT.medium, color: colors.textMuted, letterSpacing: 6 },
  center: { textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: space.md },
  button: { flex: 1, height: 96, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.borderStrong },
});
