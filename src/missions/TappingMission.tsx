import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, haptic, Txt } from '@/components/ui';
import { TAP_SECONDS, TAP_TARGET, tapCounter } from '@/core/puzzles';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

type Phase = { kind: 'ready' } | { kind: 'tapping' } | { kind: 'missed'; taps: number };

/**
 * Finger tapping: tap left, right, left… as fast as you can. The 10 seconds
 * start with the first tap; reach the level's target to pass the round.
 */
export function TappingMission({ mission, onActivity, onDone }: MissionProps) {
  const target = TAP_TARGET[mission.level];
  const [phase, setPhase] = useState<Phase>({ kind: 'ready' });
  const [taps, setTaps] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [left, setLeft] = useState(TAP_SECONDS);
  const counter = useRef(tapCounter());
  const tapsRef = useRef(0);

  // While a round runs: tick the clock, and end the round when time is up.
  useEffect(() => {
    if (phase.kind !== 'tapping') return;
    const start = Date.now();
    const tick = setInterval(() => setLeft(Math.max(0, TAP_SECONDS - (Date.now() - start) / 1000)), 100);
    const end = setTimeout(() => setPhase({ kind: 'missed', taps: tapsRef.current }), TAP_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(end);
    };
  }, [phase]);

  const reset = () => {
    counter.current = tapCounter();
    tapsRef.current = 0;
    setTaps(0);
    setLeft(TAP_SECONDS);
    setPhase({ kind: 'ready' });
  };

  const tap = (side: 'left' | 'right') => {
    onActivity();
    if (phase.kind === 'missed') return;
    if (!counter.current(side)) return;
    haptic('select');
    if (phase.kind === 'ready') setPhase({ kind: 'tapping' });
    const n = tapsRef.current + 1;
    tapsRef.current = n;
    setTaps(n);
    if (n < target) return;
    haptic('success');
    if (rounds + 1 >= mission.amount) {
      onDone();
      return;
    }
    setRounds(rounds + 1);
    reset();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={(rounds + Math.min(taps, target) / target) / mission.amount} />
        <Txt variant="caption">{`${target} taps in ${TAP_SECONDS} seconds${mission.amount > 1 ? ` · round ${rounds + 1} of ${mission.amount}` : ''}`}</Txt>
      </View>
      <View style={styles.middle}>
        <Text style={styles.count} accessibilityLiveRegion="polite">
          {taps}
          <Text style={styles.total}>{` / ${target}`}</Text>
        </Text>
        <Txt variant="muted">{phase.kind === 'ready' ? 'The clock starts with your first tap' : phase.kind === 'tapping' ? `${left.toFixed(1)} s left` : `${phase.taps} taps. So close, go again.`}</Txt>
      </View>
      {phase.kind === 'missed' ? (
        <Button title="Try again" icon="refresh" onPress={reset} />
      ) : (
        <View style={styles.pads}>
          {(['left', 'right'] as const).map((side) => (
            <Pressable key={side} onPressIn={() => tap(side)} accessibilityRole="button" accessibilityLabel={`Tap ${side}`} style={({ pressed }) => [styles.pad, pressed && styles.pressed]}>
              <Text style={styles.padText}>{side === 'left' ? 'L' : 'R'}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Txt variant="caption" style={styles.center}>Use two fingers and alternate. Tapping the same side twice doesn’t count.</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  count: { fontSize: 96, lineHeight: 108, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'] },
  total: { fontSize: 32, fontFamily: FONT.light, color: colors.textMuted },
  pads: { flexDirection: 'row', gap: space.md, height: 180 },
  pad: { flex: 1, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.accent },
  padText: { fontSize: 30, fontFamily: FONT.light, color: colors.textMuted },
  center: { textAlign: 'center' },
});
