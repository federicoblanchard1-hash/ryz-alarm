import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { triviaBag, type TriviaQuestion } from '@/core/trivia';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

function shuffled(q: TriviaQuestion): string[] {
  const out = [...q.a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Morning trivia: four choices. A wrong one shows the answer, and a new question takes its place. */
export function TriviaMission({ mission, onActivity, onDone }: MissionProps) {
  const [next] = useState(() => triviaBag());
  const [question, setQuestion] = useState(() => {
    const q = next();
    return { q, choices: shuffled(q) };
  });
  const [right, setRight] = useState(0);
  const [result, setResult] = useState<{ picked: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const ask = () => {
    const q = next();
    setQuestion({ q, choices: shuffled(q) });
    setResult(null);
  };

  const pick = (choice: string) => {
    onActivity();
    if (result) return;
    const ok = choice === question.q.a[0];
    haptic(ok ? 'light' : 'error');
    setResult({ picked: choice, ok });
    if (ok && right + 1 >= mission.amount) {
      timer.current = setTimeout(onDone, 600);
      return;
    }
    if (ok) setRight(right + 1);
    timer.current = setTimeout(ask, ok ? 700 : 1800);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={right / mission.amount} />
        <Txt variant="caption">{`${right} of ${mission.amount} right`}</Txt>
      </View>
      <Text style={styles.question} accessibilityRole="header">{question.q.q}</Text>
      <View style={styles.choices}>
        {question.choices.map((c) => {
          const isAnswer = c === question.q.a[0];
          return (
            <Pressable
              key={c}
              onPress={() => pick(c)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.choice, pressed && styles.pressed, result && isAnswer && styles.answer, result?.picked === c && !result.ok && styles.wrong]}
            >
              <Text style={[styles.choiceText, result && isAnswer && styles.answerText]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="caption" style={[styles.center, { opacity: result && !result.ok ? 1 : 0 }]}>{"Not that one. Here's the answer, then a new question."}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  question: { fontSize: 26, lineHeight: 34, fontFamily: FONT.regular, color: colors.text, textAlign: 'center', marginVertical: space.md },
  choices: { gap: space.sm },
  choice: { minHeight: 60, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, justifyContent: 'center' },
  pressed: { backgroundColor: colors.borderStrong },
  answer: { backgroundColor: colors.accent },
  wrong: { borderWidth: 2, borderColor: colors.danger },
  choiceText: { fontSize: 19, fontFamily: FONT.regular, color: colors.text },
  answerText: { color: colors.onAccent, fontFamily: FONT.medium },
  center: { textAlign: 'center' },
});
