import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { FONT, colors, space } from '@/theme';
import { haptic } from './ui';

const THUMB = 28;

interface Props {
  value: number;
  /** Called once, when the finger lifts (or after a tap or an accessibility step). */
  onChange: (value: number) => void;
  /** Called on every frame of a drag, for live feedback such as preview volume. */
  onSlide?: (value: number) => void;
  onSlideStart?: () => void;
  label: string;
  min?: number;
  /** Shows the value as a percentage on the right. */
  showValue?: boolean;
}

/**
 * A 0–1 slider that tracks the finger on the UI thread, so it stays smooth
 * even while the screen behind it re-renders. Drags move the thumb by the
 * finger's travel; a tap jumps to that spot. A light tick every 10%.
 */
export function Slider({ value, onChange, onSlide, onSlideStart, label, min = 0, showValue = false }: Props) {
  const width = useSharedValue(0);
  const pos = useSharedValue(value);
  const from = useSharedValue(value);
  const tick = useSharedValue(Math.round(value * 10));
  const active = useSharedValue(0);
  // The value under the finger while dragging; the saved value otherwise.
  const [dragged, setDragged] = useState<number | null>(null);
  const shown = dragged ?? value;

  // Follow outside changes, but never fight a finger that's dragging.
  useEffect(() => {
    if (active.get() === 0) pos.set(withTiming(value, { duration: 160 }));
  }, [value, pos, active]);

  const live = (v: number) => {
    setDragged(v);
    onSlide?.(v);
  };
  const settle = () => setDragged(null);
  const ticked = () => haptic('select');

  const pan = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .failOffsetY([-12, 12])
    .onStart(() => {
      from.set(pos.get());
      active.set(withTiming(1, { duration: 120 }));
      if (onSlideStart) scheduleOnRN(onSlideStart);
    })
    .onUpdate((e) => {
      const track = Math.max(1, width.get() - THUMB);
      const v = Math.min(1, Math.max(min, from.get() + e.translationX / track));
      pos.set(v);
      const t = Math.round(v * 10);
      if (t !== tick.get()) {
        tick.set(t);
        scheduleOnRN(ticked);
      }
      scheduleOnRN(live, v);
    })
    .onEnd(() => {
      scheduleOnRN(onChange, Math.round(pos.get() * 100) / 100);
    })
    .onFinalize(() => {
      active.set(withTiming(0, { duration: 160 }));
      scheduleOnRN(settle);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const track = Math.max(1, width.get() - THUMB);
    const v = Math.min(1, Math.max(min, (e.x - THUMB / 2) / track));
    pos.set(withTiming(v, { duration: 160 }));
    tick.set(Math.round(v * 10));
    scheduleOnRN(ticked);
    if (onSlide) scheduleOnRN(onSlide, v);
    scheduleOnRN(onChange, Math.round(v * 100) / 100);
  });

  const fill = useAnimatedStyle(() => ({ width: THUMB / 2 + pos.get() * Math.max(0, width.get() - THUMB) }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.get() * Math.max(0, width.get() - THUMB) }, { scale: 1 + active.get() * 0.15 }],
  }));

  const step = (delta: number) => {
    const v = Math.min(1, Math.max(min, Math.round((value + delta) * 10) / 10));
    pos.set(withTiming(v, { duration: 160 }));
    onChange(v);
  };

  return (
    <View style={styles.row}>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          style={styles.slider}
          onLayout={(e) => {
            width.set(e.nativeEvent.layout.width);
          }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(shown * 100), text: `${Math.round(shown * 100)}%` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1)}
        >
          <View style={styles.track} pointerEvents="none">
            <Animated.View style={[styles.fill, fill]} />
          </View>
          <Animated.View style={[styles.thumb, thumb]} pointerEvents="none" />
        </View>
      </GestureDetector>
      {showValue ? <Text style={styles.value}>{`${Math.round(shown * 100)}%`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  slider: { flex: 1, height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.text },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.text,
    boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
  },
  value: { width: 46, textAlign: 'right', fontSize: 15, fontFamily: FONT.regular, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
