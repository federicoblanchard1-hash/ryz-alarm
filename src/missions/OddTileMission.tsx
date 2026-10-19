import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { oddTile } from '@/core/missions';
import { radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

const grey = (v: number) => {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `rgb(${c},${c},${c})`;
};

/** Odd one out: find the square that is a slightly different grey. It gets subtler each round. */
export function OddTileMission({ mission, onActivity, onDone }: MissionProps) {
  const [round, setRound] = useState(0);
  const [tile, setTile] = useState(() => oddTile(mission.level, 0));
  const [wrong, setWrong] = useState(false);

  const tap = (i: number) => {
    onActivity();
    if (i !== tile.odd) {
      haptic('error');
      setWrong(true);
      return;
    }
    haptic('light');
    setWrong(false);
    if (round + 1 >= mission.amount) {
      onDone();
      return;
    }
    setRound(round + 1);
    setTile(oddTile(mission.level, round + 1));
  };

  const cells = tile.size * tile.size;
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={round / mission.amount} />
        <Txt variant="caption">{`${round + 1} of ${mission.amount}`}</Txt>
      </View>
      <View style={styles.grid}>
        {Array.from({ length: cells }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => tap(i)}
            accessibilityRole="button"
            accessibilityLabel={`Square ${i + 1}`}
            style={[styles.cell, { width: `${100 / tile.size - 2}%`, backgroundColor: grey(i === tile.odd ? tile.other : tile.base) }]}
          />
        ))}
      </View>
      <Txt variant="caption" style={[styles.center, { opacity: wrong ? 1 : 0 }]}>Not that one. Look closely.</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  cell: { aspectRatio: 1, borderRadius: radius.sm },
  center: { textAlign: 'center' },
});
