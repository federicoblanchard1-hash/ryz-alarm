import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { colors } from '@/theme';

const SIZE = 330;
const TICKS = Array.from({ length: 60 }, (_, i) => i);
const GLOW = [0.78, 0.68, 0.58, 0.48];

const BREATHE = {
  from: { opacity: 0.35, transform: [{ scale: 0.92 }] },
  to: { opacity: 0.9, transform: [{ scale: 1.04 }] },
};

/**
 * The ringing clock's frame: a ring of 60 ticks that fill up with the
 * seconds, a light dot that sweeps round once a minute, and a soft glow
 * breathing behind the time.
 */
export function RingDial({ second, children }: { second: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  // Start the sweep where the clock is, so the dot and the lit ticks agree.
  const [startAngle] = useState(() => second * 6);
  const ORBIT = {
    from: { transform: [{ rotate: `${startAngle}deg` }] },
    to: { transform: [{ rotate: `${startAngle + 360}deg` }] },
  };

  return (
    <View style={styles.box} accessible={false}>
      {/* Stacked faint circles make a soft radial glow that renders the same everywhere. */}
      <Animated.View
        style={[
          styles.glow,
          reduced ? null : { animationName: BREATHE, animationDuration: '2.6s', animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' },
        ]}
        pointerEvents="none"
      >
        {GLOW.map((scale) => (
          <View key={scale} style={[styles.glowRing, { width: SIZE * scale, height: SIZE * scale }]} />
        ))}
      </Animated.View>
      {TICKS.map((i) => {
        const major = i % 5 === 0;
        const lit = i <= second;
        return (
          <View key={i} style={[styles.tickArm, { transform: [{ rotate: `${i * 6}deg` }] }]} pointerEvents="none">
            <View style={[styles.tick, major && styles.major, lit ? styles.lit : null, i === second && styles.now]} />
          </View>
        );
      })}
      {reduced ? null : (
        <Animated.View style={[styles.orbit, { animationName: ORBIT, animationDuration: '60s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }]} pointerEvents="none">
          <View style={styles.dot} />
        </Animated.View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute', borderRadius: SIZE, backgroundColor: 'rgba(255,255,255,0.028)' },
  // Each tick hangs from an arm the full height of the dial, rotated round its centre.
  tickArm: { position: 'absolute', width: 4, height: SIZE, alignItems: 'center' },
  tick: { width: 2, height: 10, borderRadius: 1, backgroundColor: colors.surfaceRaised },
  major: { width: 3, height: 18, borderRadius: 1.5, backgroundColor: colors.borderStrong },
  lit: { backgroundColor: colors.textMuted },
  now: { backgroundColor: colors.text },
  orbit: { position: 'absolute', width: SIZE - 52, height: SIZE - 52, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: -4, backgroundColor: colors.text, boxShadow: '0 0 12px 3px rgba(255,255,255,0.55)' },
});
