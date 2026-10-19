import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { PVT_LIMIT_MS, pvtCounts, pvtDelay, PVT_FALSE_START_MS } from '@/core/missions';
import { FONT, colors, space } from '@/theme';
import { Progress, type MissionProps } from './common';

type Phase = { kind: 'waiting' } | { kind: 'lit'; at: number } | { kind: 'result'; text: string; good: boolean };

/**
 * Reaction test, after the psychomotor vigilance task used in sleep research:
 * after a random wait a light comes on, and you tap as fast as you can.
 * Too early, or slower than the level allows, doesn't count.
 */
export function ReactionMission({ mission, onActivity, onDone }: MissionProps) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'waiting' });
  const [times, setTimes] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = PVT_LIMIT_MS[mission.level];

  const arm = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase({ kind: 'waiting' });
    timer.current = setTimeout(() => setPhase({ kind: 'lit', at: Date.now() }), pvtDelay());
  };

  // The first round starts in 'waiting', so only the light needs scheduling.
  useEffect(() => {
    timer.current = setTimeout(() => setPhase({ kind: 'lit', at: Date.now() }), pvtDelay());
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const tap = () => {
    onActivity();
    if (phase.kind === 'result') return;
    if (phase.kind === 'waiting') {
      haptic('error');
      if (timer.current) clearTimeout(timer.current);
      setPhase({ kind: 'result', text: 'Too early. Wait for the light.', good: false });
      timer.current = setTimeout(arm, 1200);
      return;
    }
    const ms = Date.now() - phase.at;
    const ok = pvtCounts(ms, mission.level);
    if (ok) {
      haptic('light');
      const nextCount = count + 1;
      setCount(nextCount);
      setTimes((t) => [...t, ms]);
      if (nextCount >= mission.amount) {
        onDone();
        return;
      }
    } else {
      haptic('error');
    }
    setPhase({ kind: 'result', text: ok ? `${ms} ms` : ms < PVT_FALSE_START_MS ? 'Too early.' : `${ms} ms. Too slow, under ${limit} ms counts.`, good: ok });
    timer.current = setTimeout(arm, 900);
  };

  const average = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const lit = phase.kind === 'lit';
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={count / mission.amount} />
        <Txt variant="caption">{`${count} of ${mission.amount}${average ? ` · average ${average} ms` : ''}`}</Txt>
      </View>
      <Pressable onPressIn={tap} accessibilityRole="button" accessibilityLabel={lit ? 'Tap now' : 'Wait for the light, then tap'} style={[styles.pad, lit && styles.padLit]}>
        {phase.kind === 'result' ? (
          <Text style={[styles.result, !phase.good && styles.bad]}>{phase.text}</Text>
        ) : (
          <Text style={[styles.label, lit && styles.labelLit]}>{lit ? 'TAP' : 'Wait for the light…'}</Text>
        )}
      </Pressable>
      <Txt variant="caption" style={styles.center}>
        The test sleep scientists use to measure alertness. Tap the moment the screen lights up.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  pad: { flex: 1, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  padLit: { backgroundColor: colors.accent },
  label: { fontSize: 22, fontFamily: FONT.light, color: colors.textMuted, textAlign: 'center' },
  labelLit: { fontSize: 56, fontFamily: FONT.semibold, color: colors.onAccent, letterSpacing: 4 },
  result: { fontSize: 30, lineHeight: 38, fontFamily: FONT.regular, color: colors.text, textAlign: 'center' },
  bad: { color: colors.textMuted, fontSize: 22, lineHeight: 30 },
  center: { textAlign: 'center' },
});
