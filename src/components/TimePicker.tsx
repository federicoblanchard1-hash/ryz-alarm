import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { colors, space } from '@/theme';
import { haptic } from './ui';

// A wheel like Alarmy's: three rows showing, the middle one on a grey band.
const ITEM = 46;
/** Hours and minutes repeat this many times so the wheel seems endless; it re-centres when it stops. */
const LOOPS = 7;
/** How long the wheel must be still before it counts as stopped. Works the same on web, which has no momentum events. */
const SETTLE_MS = 120;

const Item = memo(function Item({ label, selected }: { label: string; selected: boolean }) {
  return (
    <View style={styles.item}>
      <Text style={[styles.text, selected && styles.selected]}>{label}</Text>
    </View>
  );
});

function Wheel({ labels, index, onChange, loop, name }: { labels: string[]; index: number; onChange: (index: number) => void; loop: boolean; name: string }) {
  const n = labels.length;
  const middle = loop ? Math.floor(LOOPS / 2) * n : 0;
  const rows = useMemo(() => (loop ? Array.from({ length: n * LOOPS }, (_, i) => labels[i % n]) : labels), [labels, loop, n]);
  const ref = useRef<ScrollView>(null);
  const [center, setCenter] = useState(middle + index);
  const state = useRef({ center: middle + index, y: (middle + index) * ITEM, timer: null as ReturnType<typeof setTimeout> | null });
  const latest = useRef({ index, onChange });
  useEffect(() => {
    latest.current = { index, onChange };
  });
  useEffect(() => () => {
    if (state.current.timer) clearTimeout(state.current.timer);
  }, []);

  const scrollTo = (row: number, animated: boolean) => ref.current?.scrollTo({ y: row * ITEM, animated });

  const settle = () => {
    const s = state.current;
    const row = s.center;
    if (Math.abs(s.y - row * ITEM) > 1) {
      // Not lined up yet (web, or a slow release): snap, and settle again when it stops.
      scrollTo(row, true);
      return;
    }
    const value = row % n;
    if (loop && row !== middle + value) {
      s.center = middle + value;
      setCenter(s.center);
      scrollTo(s.center, false);
    }
    if (value !== latest.current.index) latest.current.onChange(value);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const s = state.current;
    s.y = e.nativeEvent.contentOffset.y;
    const row = Math.min(rows.length - 1, Math.max(0, Math.round(s.y / ITEM)));
    if (row !== s.center) {
      s.center = row;
      setCenter(row);
      haptic('select');
    }
    if (s.timer) clearTimeout(s.timer);
    s.timer = setTimeout(settle, SETTLE_MS);
  };

  const step = (delta: number) => {
    const value = (index + delta + n) % n;
    if (!loop && (index + delta < 0 || index + delta >= n)) return;
    onChange(value);
    state.current.center = middle + value;
    setCenter(middle + value);
    scrollTo(middle + value, true);
  };

  return (
    <View
      style={styles.wheel}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={name}
      accessibilityValue={{ text: labels[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: (middle + index) * ITEM }}
        onLayout={() => scrollTo(state.current.center, false)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
      >
        {rows.map((label, i) => (
          <Item key={i} label={label} selected={i === center} />
        ))}
      </ScrollView>
    </View>
  );
}

const HOURS_12 = ['12', ...Array.from({ length: 11 }, (_, i) => String(i + 1))];
const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

interface Props {
  hour: number;
  minute: number;
  use24h: boolean;
  onChange: (hour: number, minute: number) => void;
}

export function TimePicker({ hour, minute, use24h, onChange }: Props) {
  const pm = hour >= 12;
  return (
    <View style={styles.wrap}>
      <View style={styles.band} pointerEvents="none" />
      <View style={styles.columns}>
        {use24h ? (
          <Wheel name="Hour" labels={HOURS_24} index={hour} loop onChange={(h) => onChange(h, minute)} />
        ) : (
          <Wheel name="Hour" labels={HOURS_12} index={hour % 12} loop onChange={(h) => onChange(h + (pm ? 12 : 0), minute)} />
        )}
        <Wheel name="Minute" labels={MINUTES} index={minute} loop onChange={(m) => onChange(hour, m)} />
        {use24h ? null : <Wheel name="AM or PM" labels={PERIODS} index={pm ? 1 : 0} loop={false} onChange={(p) => onChange((hour % 12) + (p === 1 ? 12 : 0), minute)} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Bleeds past the screen padding so the band runs edge to edge, like Alarmy's.
  wrap: { height: ITEM * 3, marginHorizontal: -space.lg, justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: ITEM, height: ITEM, borderRadius: 16, backgroundColor: colors.surface },
  columns: { flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  wheel: { width: 92, height: ITEM * 3 },
  content: { paddingVertical: ITEM },
  item: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 31, lineHeight: 38, fontWeight: '600', color: colors.textFaint, fontVariant: ['tabular-nums'] },
  selected: { fontSize: 35, lineHeight: 42, color: colors.text },
});
