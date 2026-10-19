import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { haptic, Txt } from '@/components/ui';
import { makePattern, memoryGrid } from '@/core/missions';
import { colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

type Phase = 'show' | 'input' | 'wrong' | 'cleared';

/** Some squares light up; tap the same ones. One more square each round. */
export function MemoryMission({ mission, onActivity, onDone }: MissionProps) {
  const { width } = useWindowDimensions();
  const { size } = memoryGrid(mission.level);
  const [round, setRound] = useState(0);
  const [pattern, setPattern] = useState(() => makePattern(mission.level, 0));
  const [found, setFound] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('show');

  useEffect(() => {
    if (phase === 'show') {
      const timer = setTimeout(() => setPhase('input'), 1200 + pattern.length * 220);
      return () => clearTimeout(timer);
    }
    if (phase === 'wrong' || phase === 'cleared') {
      const timer = setTimeout(() => {
        const nextRound = phase === 'cleared' ? round + 1 : round;
        setRound(nextRound);
        setPattern(makePattern(mission.level, nextRound));
        setFound([]);
        setPhase('show');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [phase, pattern, round, mission.level]);

  const tap = (i: number) => {
    if (phase !== 'input' || found.includes(i)) return;
    onActivity();
    if (!pattern.includes(i)) {
      haptic('error');
      setPhase('wrong');
      return;
    }
    haptic('select');
    const next = [...found, i];
    setFound(next);
    if (next.length === pattern.length) {
      if (round + 1 >= mission.amount) onDone();
      else setPhase('cleared');
    }
  };

  const gap = space.sm;
  const board = Math.min(width - space.xl * 2, 360);
  const tile = (board - gap * (size - 1)) / size;
  const caption =
    phase === 'show' ? 'Remember the white squares' : phase === 'wrong' ? 'Not quite. Watch again' : phase === 'cleared' ? 'Nice!' : `Tap them · ${found.length} of ${pattern.length}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={round / mission.amount} />
        <Txt variant="caption">{`Round ${round + 1} of ${mission.amount}`}</Txt>
      </View>
      <Txt variant="heading" style={styles.center} accessibilityLiveRegion="polite">{caption}</Txt>
      <View style={[styles.board, { width: board, height: board, gap }]}>
        {Array.from({ length: size * size }, (_, i) => {
          const lit = (phase === 'show' && pattern.includes(i)) || found.includes(i) || (phase === 'wrong' && pattern.includes(i));
          return (
            <Pressable key={i} onPress={() => tap(i)} accessibilityRole="button" accessibilityLabel={`Square ${i + 1}`} accessibilityState={{ selected: found.includes(i) }}>
              <Animated.View
                style={[
                  styles.tile,
                  { width: tile, height: tile },
                  lit && styles.lit,
                  phase === 'wrong' && pattern.includes(i) && !found.includes(i) && styles.missed,
                  { transitionProperty: 'backgroundColor', transitionDuration: '150ms' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', alignItems: 'stretch', gap: space.lg },
  top: { gap: space.sm },
  center: { textAlign: 'center' },
  board: { alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap' },
  tile: { borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  lit: { backgroundColor: colors.accent },
  missed: { backgroundColor: colors.textFaint },
});
