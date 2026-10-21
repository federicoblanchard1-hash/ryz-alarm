import Ionicons from '@expo/vector-icons/Ionicons';
import { Accelerometer, Gyroscope, LightSensor, Pedometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { LIGHT_LUX, MISSIONS, lightTimer, reachCounter, shakeCounter, sprintTimer, squatCounter, twistCounter } from '@/core/missions';
import { FONT, colors, space } from '@/theme';
import { MISSION_ICONS, Progress, type MissionProps } from './common';

const HINTS = {
  shake: 'Shake your phone hard, like you mean it.',
  squats: 'Hold the phone flat against your chest, then squat all the way down and stand back up.',
  steps: 'Get out of bed and walk around with your phone.',
  jacks: 'Hold your phone firmly and do jumping jacks. Each landing counts.',
  sprint: 'Run on the spot or do high knees. The clock only runs while you move hard.',
  twists: 'Stand up, hold the phone flat to your chest, and twist left and right.',
  reach: 'Stand up, push the phone high above your head, then bring it back down.',
  light: 'Open the curtains or switch the lights on, and keep the phone facing the room.',
};

type BodyType = keyof typeof HINTS;

/** Counts shakes, squats, steps, jumping jacks, twists or reaches, or the seconds of a sprint or of bright light, until the target is reached. */
export function BodyMission({ mission, onActivity, onDone }: MissionProps) {
  const [count, setCount] = useState(0);
  /** Light mission: how bright it is now, in lux. */
  const [lux, setLux] = useState<number | null>(null);
  const done = useRef(false);
  const type = mission.type as BodyType;
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
    if (type === 'twists') {
      const twist = twistCounter();
      Gyroscope.setUpdateInterval(40);
      const sub = Gyroscope.addListener(({ x, y, z }) => {
        if (twist({ x, y, z, t: Date.now() })) setCount((c) => c + 1);
      });
      return () => sub.remove();
    }
    if (type === 'light') {
      const lit = lightTimer(mission.level);
      LightSensor.setUpdateInterval(250);
      const sub = LightSensor.addListener(({ illuminance }) => {
        setLux(Math.round(illuminance));
        setCount(Math.floor(lit(illuminance, Date.now()) / 1000));
      });
      return () => sub.remove();
    }
    if (type === 'sprint') {
      const run = sprintTimer();
      Accelerometer.setUpdateInterval(40);
      const sub = Accelerometer.addListener(({ x, y, z }) => {
        const seconds = Math.floor(run({ x, y, z, t: Date.now() }) / 1000);
        setCount((c) => (c === seconds ? c : seconds));
      });
      return () => sub.remove();
    }
    // A jumping jack lands harder and slower than a shake.
    const counts = type === 'shake' ? shakeCounter() : type === 'jacks' ? shakeCounter(2.1, 450) : type === 'reach' ? reachCounter() : squatCounter();
    Accelerometer.setUpdateInterval(type === 'squats' ? 50 : 40);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (counts({ x, y, z, t: Date.now() })) setCount((c) => c + 1);
    });
    return () => sub.remove();
  }, [type, mission.level]);

  useEffect(() => {
    if (count === 0) return;
    callbacks.current.onActivity();
    if (type === 'squats' || type === 'jacks' || type === 'twists' || type === 'reach') haptic('light');
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
        {type === 'light' ? <Txt variant="muted">{lux === null ? 'Measuring the light…' : `${lux} lux now · needs ${LIGHT_LUX[mission.level]}`}</Txt> : null}
        {type === 'sprint' ? <Txt variant="muted">Keep moving: the clock stops when you do.</Txt> : null}
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
  count: { fontSize: 96, lineHeight: 108, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'] },
  total: { fontSize: 32, fontFamily: FONT.light, color: colors.textMuted },
  bottom: { gap: space.md },
  hint: { textAlign: 'center' },
});
