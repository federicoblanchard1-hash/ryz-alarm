import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { PAIR_FACES, pairsDeck } from '@/core/puzzles';
import { colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/** Pairs: flip two cards; a match stays face up, a miss flips back. */
export function PairsMission({ mission, onActivity, onDone }: MissionProps) {
  const [deck, setDeck] = useState(() => pairsDeck(mission.level));
  const [boards, setBoards] = useState(0);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const pairs = deck.cards.length / 2;

  const flip = (i: number) => {
    onActivity();
    if (open.length === 2 || open.includes(i) || found.has(i)) return;
    haptic('select');
    const now = [...open, i];
    setOpen(now);
    if (now.length < 2) return;
    const [a, b] = now;
    if (deck.cards[a] !== deck.cards[b]) {
      timer.current = setTimeout(() => setOpen([]), 800);
      return;
    }
    haptic('light');
    const nextFound = new Set(found).add(a).add(b);
    setFound(nextFound);
    setOpen([]);
    if (nextFound.size < deck.cards.length) return;
    if (boards + 1 >= mission.amount) {
      onDone();
      return;
    }
    setBoards(boards + 1);
    setDeck(pairsDeck(mission.level));
    setFound(new Set());
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={(boards * pairs + found.size / 2) / (mission.amount * pairs)} />
        <Txt variant="caption">{`${found.size / 2} of ${pairs} pairs${mission.amount > 1 ? ` · board ${boards + 1} of ${mission.amount}` : ''}`}</Txt>
      </View>
      <View style={styles.grid}>
        {deck.cards.map((face, i) => {
          const up = found.has(i) || open.includes(i);
          return (
            <Pressable
              key={i}
              onPress={() => flip(i)}
              accessibilityRole="button"
              accessibilityLabel={up ? PAIR_FACES[face] : 'Hidden card'}
              style={[styles.card, { width: `${100 / deck.columns - 2.5}%` }, up && styles.up, found.has(i) && styles.found]}
            >
              {up ? <Ionicons name={PAIR_FACES[face]} size={30} color={found.has(i) ? colors.textMuted : colors.onAccent} /> : null}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  card: { aspectRatio: 0.82, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  up: { backgroundColor: colors.accent },
  found: { backgroundColor: colors.surface },
});
