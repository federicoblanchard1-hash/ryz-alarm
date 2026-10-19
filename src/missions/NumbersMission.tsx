import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { numberBoard } from '@/core/missions';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/** Number hunt (a Schulte table): tap 1, 2, 3… on a shuffled board. */
export function NumbersMission({ mission, onActivity, onDone }: MissionProps) {
  const [board, setBoard] = useState(() => numberBoard(mission.level));
  const [next, setNext] = useState(1);
  const [boards, setBoards] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const total = board.size * board.size;

  const tap = (n: number) => {
    onActivity();
    if (n !== next) {
      haptic('error');
      setWrong(n);
      return;
    }
    haptic('select');
    setWrong(null);
    if (n < total) {
      setNext(n + 1);
      return;
    }
    if (boards + 1 >= mission.amount) {
      onDone();
      return;
    }
    setBoards(boards + 1);
    setBoard(numberBoard(mission.level));
    setNext(1);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={(boards * total + next - 1) / (mission.amount * total)} />
        <Txt variant="caption">{mission.amount > 1 ? `Board ${boards + 1} of ${mission.amount}` : ' '}</Txt>
      </View>
      <Text style={styles.find} accessibilityLiveRegion="polite">{`Find ${next}`}</Text>
      <View style={styles.grid}>
        {board.numbers.map((n) => {
          const found = n < next;
          return (
            <Pressable
              key={n}
              onPress={() => tap(n)}
              disabled={found}
              accessibilityRole="button"
              accessibilityLabel={String(n)}
              style={({ pressed }) => [styles.cell, { width: `${100 / board.size - 2}%` }, found && styles.found, wrong === n && styles.wrong, pressed && styles.pressed]}
            >
              <Text style={[styles.num, found && styles.numFound, board.size > 4 && styles.small]}>{n}</Text>
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
  find: { fontSize: 34, lineHeight: 40, fontFamily: FONT.display, color: colors.text, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  cell: { aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  found: { backgroundColor: colors.surface },
  wrong: { borderWidth: 2, borderColor: colors.danger },
  pressed: { opacity: 0.7 },
  num: { fontSize: 26, fontFamily: FONT.regular, color: colors.text, fontVariant: ['tabular-nums'] },
  small: { fontSize: 20 },
  numFound: { color: colors.textFaint },
});
