import Ionicons from '@expo/vector-icons/Ionicons';
import { Accelerometer, Pedometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { MISSIONS, shakeCounter, squatCounter } from '@/core/missions';
import { colors, space } from '@/theme';
import { MISSION_ICONS, Progress, type MissionProps } from './common';

const HINTS = {
  shake: 'Shake your phone hard, like you mean it.',
  squats: 'Hold the phone flat against your chest, then squat all the way down and stand back up.',
  steps: 'Get out of bed and walk around with your phone.',
};

/** Counts shakes, squats or steps until the target is reached. */
export function BodyMission({ mission, onActivity, onDone }: MissionProps) {
  const [count, setCount] = useState(0);
  const done = useRef(false);
  const type = mission.type as 'shake' | 'squats' | 'steps';
  // Latest callbacks, so a new function from the parent doesn't count as a new shake.
  const callbacks = useRef({ onActivity, onDone });
  useEffect(() => {
    callbacks.current = { onActivity, onDone };
  });

  useEffect(() => {
    if (type === 'steps') {
      let sub: { remove: () => void } | null = null;
      let cancelled = false;
      Pedometer.requestPermissionsAsync()
        .catch(() => null)
        .then(() => {
          if (!cancelled) sub = Pedometer.watchStepCount((r) => setCount(r.steps));
        });
      return () => {
        cancelled = true;
        sub?.remove();
      };
    }
    const counts = type === 'shake' ? shakeCounter() : squatCounter();
    Accelerometer.setUpdateInterval(type === 'shake' ? 40 : 50);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (counts({ x, y, z, t: Date.now() })) setCount((c) => c + 1);
    });
    return () => sub.remove();
  }, [type]);

  useEffect(() => {
    if (count === 0) return;
    callbacks.current.onActivity();
    if (type === 'squats') haptic('light');
    if (count >= mission.amount && !done.current) {
      done.current = true;
      callbacks.current.onDone();
    }
  }, [count, mission.amount, type]);

  const shown = Math.min(count, mission.amount);
  return (
    <View style={styles.wrap}>
      <View style={styles.center}>
        <Ionicons name={MISSION_ICONS[type]} size={56} color={colors.text} />
        <Text style={styles.count} accessibilityLiveRegion="polite" accessibilityLabel={`${shown} of ${mission.amount}`}>
          {shown}
          <Text style={styles.total}>{` / ${mission.amount}`}</Text>
        </Text>
        <Txt variant="heading">{MISSIONS[type].unit(mission.amount).replace(/^\d+ /, '')}</Txt>
      </View>
      <View style={styles.bottom}>
        <Progress value={shown / mission.amount} />
        <Txt variant="muted" style={styles.hint}>{HINTS[type]}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  count: { fontSize: 96, lineHeight: 108, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'] },
  total: { fontSize: 32, fontWeight: '300', color: colors.textMuted },
  bottom: { gap: space.md },
  hint: { textAlign: 'center' },
});
