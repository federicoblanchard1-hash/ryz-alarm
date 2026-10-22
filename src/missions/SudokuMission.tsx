import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { sudokuClashes, sudokuPuzzle, sudokuSolved } from '@/core/puzzles';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/** Mini sudoku: pick an empty cell, then a number. Clashes show in red; a full, correct grid finishes it. */
export function SudokuMission({ mission, onActivity, onDone }: MissionProps) {
  const [puzzle, setPuzzle] = useState(() => sudokuPuzzle(mission.level));
  const [grid, setGrid] = useState(puzzle.puzzle);
  const [selected, setSelected] = useState<number | null>(() => puzzle.puzzle.indexOf(0));
  const [solved, setSolved] = useState(0);
  const { size, boxRows, boxColumns } = puzzle;
  const clashes = sudokuClashes(grid, puzzle);

  const put = (digit: number) => {
    onActivity();
    if (selected === null) return;
    haptic('select');
    const next = grid.map((d, i) => (i === selected ? digit : d));
    setGrid(next);
    if (!sudokuSolved(next, puzzle)) {
      // On to the next empty cell, to keep it quick.
      if (digit) {
        const empty = (d: number, i: number) => d === 0 && puzzle.puzzle[i] === 0;
        const after = next.findIndex((d, i) => i > selected && empty(d, i));
        const first = next.findIndex(empty);
        setSelected(after >= 0 ? after : first >= 0 ? first : selected);
      }
      return;
    }
    haptic('success');
    if (solved + 1 >= mission.amount) {
      onDone();
      return;
    }
    const fresh = sudokuPuzzle(mission.level);
    setSolved(solved + 1);
    setPuzzle(fresh);
    setGrid(fresh.puzzle);
    setSelected(fresh.puzzle.indexOf(0));
  };

  const blanks = puzzle.puzzle.filter((d) => d === 0).length;
  const filled = grid.filter((d, i) => d && !puzzle.puzzle[i]).length;
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={(solved + filled / blanks) / mission.amount} />
        <Txt variant="caption">{`Every row, column and box holds 1 to ${size} once${mission.amount > 1 ? ` · grid ${solved + 1} of ${mission.amount}` : ''}`}</Txt>
      </View>
      <View style={styles.grid}>
        {grid.map((d, i) => {
          const given = puzzle.puzzle[i] !== 0;
          const r = Math.floor(i / size);
          const c = i % size;
          return (
            <Pressable
              key={i}
              disabled={given}
              onPress={() => {
                haptic('select');
                setSelected(i);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Row ${r + 1}, column ${c + 1}, ${d || 'empty'}`}
              style={[
                styles.cell,
                { width: `${100 / size}%` },
                c % boxColumns === boxColumns - 1 && c < size - 1 && styles.boxRight,
                r % boxRows === boxRows - 1 && r < size - 1 && styles.boxBottom,
                selected === i && styles.selected,
              ]}
            >
              <Text style={[styles.digit, given && styles.given, clashes.has(i) && !given && styles.clash, size > 4 && styles.small]}>{d || ''}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.pad}>
        {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
          <Pressable key={n} onPress={() => put(n)} accessibilityRole="button" style={({ pressed }) => [styles.key, pressed && styles.pressed]}>
            <Text style={styles.keyText}>{n}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => put(0)} accessibilityRole="button" accessibilityLabel="Clear" style={({ pressed }) => [styles.key, pressed && styles.pressed]}>
          <Ionicons name="backspace-outline" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', gap: space.lg },
  top: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: radius.md, borderWidth: 2, borderColor: colors.borderStrong, overflow: 'hidden' },
  cell: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  boxRight: { borderRightWidth: 2, borderRightColor: colors.borderStrong },
  boxBottom: { borderBottomWidth: 2, borderBottomColor: colors.borderStrong },
  selected: { backgroundColor: colors.surfaceRaised },
  digit: { fontSize: 32, fontFamily: FONT.regular, color: colors.text },
  small: { fontSize: 24 },
  given: { fontFamily: FONT.semibold },
  clash: { color: colors.danger },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  key: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.borderStrong },
  keyText: { fontSize: 26, fontFamily: FONT.regular, color: colors.text },
});
