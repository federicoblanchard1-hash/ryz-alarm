import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, radius } from '@/theme';

/**
 * Stop for deep sleepers: hold for `holdMs`. A half-awake tap can't turn the
 * alarm off by accident. Screen readers activate it directly.
 */
export function HoldButton({ title, holdMs, accent, onDone }: { title: string; holdMs: number; accent: string; onDone: () => void }) {
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
      style={[styles.button, { borderColor: accent }]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: accent, width: holding ? width : 0 },
          // Fills linearly while held (it's a timer), snaps back fast on release.
          { transitionProperty: 'width', transitionDuration: holding ? holdMs : 180, transitionTimingFunction: holding ? 'linear' : 'ease-out' },
        ]}
      />
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  labelWrap: { alignItems: 'center' },
  label: { fontSize: 18, fontWeight: '700' },
});
