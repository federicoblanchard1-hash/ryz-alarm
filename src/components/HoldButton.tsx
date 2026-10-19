import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, radius } from '@/theme';

/**
 * Stop for deep sleepers: hold for `holdMs`. A half-awake tap can't turn the
 * alarm off by accident. Screen readers activate it directly.
 */
export function HoldButton({ title, holdMs, onDone }: { title: string; holdMs: number; onDone: () => void }) {
  const [holding, setHolding] = useState(false);
  const [width, setWidth] = useState(0);
  return (
    <Pressable
      onPressIn={() => setHolding(true)}
      onPressOut={() => setHolding(false)}
      onLongPress={onDone}
      delayLongPress={holdMs}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && onDone()}
      style={styles.button}
    >
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={styles.label}>{title}</Text>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          { width: holding ? width : 0 },
          // Fills linearly while held (it's a timer), snaps back fast on release.
          { transitionProperty: 'width', transitionDuration: holding ? holdMs : 180, transitionTimingFunction: holding ? 'linear' : 'ease-out' },
        ]}
      >
        {/* A black copy of the label, revealed by the white fill as it grows. */}
        <View style={[styles.labelWrap, styles.inner, { width }]}>
          <Text style={[styles.label, styles.labelOn]}>{title}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.text,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', backgroundColor: colors.accent },
  labelWrap: { alignItems: 'center' },
  inner: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '700', color: colors.text },
  labelOn: { color: colors.onAccent },
});
