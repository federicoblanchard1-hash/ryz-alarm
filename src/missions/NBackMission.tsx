import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { NBACK_MS, isNBackMatch, nextNBack } from '@/core/puzzles';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/**
 * 2-back: letters come one at a time. Tap Match when the letter is the same
 * as the one two before it. Only real matches count; a wrong tap or a missed
 * match just says so.
 */
export function NBackMission({ mission, onActivity, onDone }: MissionProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [hits, setHits] = useState(0);
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null);
  const answered = useRef(false);
  const finished = useRef(false);
  const latest = useRef(history);
  useEffect(() => {
    latest.current = history;
  }, [history]);

  useEffect(() => {
    const show = () => {
      const h = latest.current;
      // The letter that's leaving was a match nobody tapped.
      if (isNBackMatch(h) && !answered.current) setNote({ text: `Missed one: ${h[h.length - 1]} matched.`, good: false });
      answered.current = false;
      const next = [...h, nextNBack(h)].slice(-6);
      latest.current = next;
      setHistory(next);
    };
    show();
    const timer = setInterval(show, NBACK_MS[mission.level]);
    return () => clearInterval(timer);
  }, [mission.level]);

  const tap = () => {
    onActivity();
    if (answered.current || finished.current) return;
    answered.current = true;
    if (!isNBackMatch(history)) {
      haptic('error');
      setNote({ text: 'Not a match. Same as two letters back?', good: false });
      return;
    }
    haptic('light');
    setNote({ text: 'Match!', good: true });
    if (hits + 1 >= mission.amount) {
      finished.current = true;
      onDone();
      return;
    }
    setHits(hits + 1);
  };

  const letter = history[history.length - 1] ?? '';
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={hits / mission.amount} />
        <Txt variant="caption">{`${hits} of ${mission.amount} matches`}</Txt>
      </View>
      <View style={styles.middle}>
        <Text style={styles.letter} accessibilityLiveRegion="polite">{letter}</Text>
        <Txt variant="caption" style={[styles.center, note && !note.good && styles.bad, { opacity: note ? 1 : 0 }]}>{note?.text ?? ' '}</Txt>
      </View>
      <Pressable onPressIn={tap} accessibilityRole="button" accessibilityLabel="Match" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>Match</Text>
      </Pressable>
      <Txt variant="caption" style={styles.center}>Tap Match when the letter is the same as the one two before it.</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  letter: { fontSize: 120, lineHeight: 136, fontFamily: FONT.light, color: colors.text },
  center: { textAlign: 'center' },
  bad: { color: colors.textMuted },
  button: { height: 88, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  buttonText: { fontSize: 26, fontFamily: FONT.semibold, color: colors.onAccent, letterSpacing: 1 },
});
