import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type CSSTransitionProperties } from 'react-native-reanimated';

import type { IconName } from '@/components/ui';
import type { Mission, MissionType } from '@/core/missions';
import { EASE_OUT, colors, radius } from '@/theme';

export const MISSION_ICONS: Record<MissionType, IconName> = {
  math: 'calculator-outline',
  memory: 'grid-outline',
  typing: 'text-outline',
  shake: 'phone-portrait-outline',
  squats: 'body-outline',
  steps: 'walk-outline',
  numbers: 'apps-outline',
  oddtile: 'contrast-outline',
  symbol: 'help-circle-outline',
  unscramble: 'shuffle-outline',
  qr: 'qr-code-outline',
  pvt: 'flash-outline',
  arrows: 'swap-horizontal-outline',
  jacks: 'fitness-outline',
  sprint: 'speedometer-outline',
  twists: 'sync-outline',
  reach: 'arrow-up-circle-outline',
  light: 'sunny-outline',
};

export interface MissionProps {
  mission: Mission;
  /** Called on every tap, shake or step, so the alarm stays quiet while you're busy. */
  onActivity: () => void;
  onDone: () => void;
}

const FILL_TRANSITION: CSSTransitionProperties = { transitionProperty: 'width', transitionDuration: '250ms', transitionTimingFunction: EASE_OUT };

/** A thin white bar. The fill is absolutely positioned and childless, so animating its width is cheap. */
export function Progress({ value }: { value: number }) {
  const [width, setWidth] = useState(0);
  return (
    <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View style={[styles.fill, FILL_TRANSITION, { width: Math.max(0, Math.min(1, value)) * width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill, backgroundColor: colors.accent },
});
