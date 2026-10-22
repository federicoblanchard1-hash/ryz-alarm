import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { slideBoard, slideMove, slideSolved } from '@/core/puzzles';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/** Sliding puzzle: tap a tile next to the gap to slide it, until 1, 2, 3… are back in order. */
export function SlideMission({ mission, onActivity, onDone }: MissionProps) {
  const [board, setBoard] = useState(() => slideBoard(mission.level));
  const [solved, setSolved] = useState(0);
  const [moves, setMoves] = useState(0);
  const { size, tiles } = board;

  const tap = (index: number) => {
    onActivity();
    const next = slideMove(tiles, size, index);
    if (!next) {
      haptic('error');
      return;
    }
    haptic('select');
    setMoves((m) => m + 1);
    if (!slideSolved(next)) {
      setBoard({ size, tiles: next });
      return;
    }
    haptic('success');
    if (solved + 1 >= mission.amount) {
      onDone();
      return;
    }
    setSolved(solved + 1);
    setBoard(slideBoard(mission.level));
    setMoves(0);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={solved / mission.amount} />
        <Txt variant="caption">{`${mission.amount > 1 ? `Puzzle ${solved + 1} of ${mission.amount} · ` : ''}${moves} ${moves === 1 ? 'move' : 'moves'}`}</Txt>
      </View>
      <View style={styles.board}>
        {tiles.map((t, i) =>
          t === 0 ? (
            <View key="gap" style={[styles.cell, { width: `${100 / size - 2}%` }]} />
          ) : (
            <Pressable
              key={t}
              onPress={() => tap(i)}
              accessibilityRole="button"
              accessibilityLabel={`Tile ${t}`}
              style={({ pressed }) => [styles.cell, styles.tile, { width: `${100 / size - 2}%` }, t === i + 1 && styles.home, pressed && styles.pressed]}
            >
              <Text style={[styles.num, size > 3 && styles.small]}>{t}</Text>
            </Pressable>
          ),
        )}
      </View>
      <Txt variant="muted" style={styles.center}>Tap a tile next to the gap to slide it. Put 1 to {size * size - 1} back in order.</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  board: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm, padding: space.sm, borderRadius: radius.lg, backgroundColor: colors.surface },
  cell: { aspectRatio: 1, borderRadius: radius.md },
  tile: { backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  home: { borderWidth: 1.5, borderColor: colors.borderStrong },
  pressed: { opacity: 0.7 },
  num: { fontSize: 34, fontFamily: FONT.light, color: colors.text, fontVariant: ['tabular-nums'] },
  small: { fontSize: 26 },
  center: { textAlign: 'center' },
});
