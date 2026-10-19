import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HoldButton } from '@/components/HoldButton';
import { Button, Txt, haptic } from '@/components/ui';
import { soundAt } from '@/core/plan';
import { canSnooze, defaultAlarmFor, findActive, snooze, stop } from '@/core/ring';
import { MINUTE, formatClock } from '@/core/time';
import type { ActiveRing } from '@/core/types';
import { clearDelivered } from '@/services/notifications';
import { useRingSound } from '@/services/sound';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme';

type Ring = Extract<ActiveRing, { type: 'ring' }>;

const PULSE = {
  from: { transform: [{ scale: 0.6 }], opacity: 0.55 },
  to: { transform: [{ scale: 1.5 }], opacity: 0 },
};

function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function RingScreen() {
  const { data, update } = useStore();
  // The ring this screen is for and its settings, fixed when it opens: the
  // sound restarts whenever they change identity, so they must not change
  // on every clock tick.
  const [{ ring, alarm }] = useState(() => {
    const active = findActive(data, Date.now());
    const r: Ring | null = active?.type === 'ring' ? active : null;
    return { ring: r, alarm: r ? defaultAlarmFor(data, r.alarmId) : undefined };
  });
  const [done, setDone] = useState(false);
  const now = useClock();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  useKeepAwake();
  useRingSound(alarm, ring?.source ?? 'alarm', ring?.at ?? 0, Boolean(ring && alarm) && !done);

  useEffect(() => {
    if (!ring || !alarm) router.replace('/');
    else clearDelivered();
  }, [ring, alarm]);

  const snoozeNow = useCallback(() => {
    if (!ring) return;
    setDone(true);
    update((d, t) => snooze(d, ring, t));
    clearDelivered();
    router.replace('/');
  }, [ring, update]);

  const stopNow = () => {
    if (!ring) return;
    setDone(true);
    haptic('success');
    update((d, t) => stop(d, ring, t));
    clearDelivered();
    router.replace('/morning');
  };

  // Nobody touched it for the whole ring: snooze if allowed, otherwise keep ringing.
  useEffect(() => {
    if (!ring || !alarm || !canSnooze(alarm, ring)) return;
    const timer = setTimeout(snoozeNow, Math.max(0, ring.at + alarm.ringMinutes * MINUTE - Date.now()));
    return () => clearTimeout(timer);
  }, [ring, alarm, snoozeNow]);

  if (!ring || !alarm) return <View style={styles.screen} />;

  const deepNow = soundAt(alarm, ring.source, (now - ring.at) / 1000) === 'deep';
  const accent = deepNow ? colors.deep : colors.gentle;
  const clock = formatClock(new Date(now).getHours(), new Date(now).getMinutes(), data.settings.use24h);
  const snoozesLeft = alarm.snooze.limit - ring.snoozesUsed;
  const subtitle =
    ring.source === 'recheck' ? "You didn't answer — time to get up" : ring.source === 'snooze' ? 'Snooze is over' : alarm.label || (alarm.mode === 'deep' ? 'Deep sleeper alarm' : 'Good morning');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.top}>
        <View style={styles.pulseBox} accessible={false}>
          {reduced ? (
            <View style={[styles.pulse, { borderColor: accent, opacity: 0.35 }]} />
          ) : (
            [0, 1200].map((delay) => (
              <Animated.View
                key={delay}
                style={[
                  styles.pulse,
                  { borderColor: accent },
                  { animationName: PULSE, animationDuration: '2.4s', animationDelay: `${delay}ms`, animationIterationCount: 'infinite', animationTimingFunction: 'ease-out' },
                ]}
              />
            ))
          )}
          <View style={styles.clockRow}>
            <Txt style={styles.clock} accessibilityRole="header">{clock.time}</Txt>
            {clock.period ? <Txt style={styles.period}>{clock.period}</Txt> : null}
          </View>
        </View>
        <Txt variant="heading" style={styles.center}>{subtitle}</Txt>
        {deepNow && alarm.mode === 'gentle' && ring.source !== 'recheck' ? <Txt variant="caption" style={styles.center}>Switched to the deep sleeper tone</Txt> : null}
      </View>

      <View style={styles.actions}>
        {canSnooze(alarm, ring) ? (
          <Button
            title={`Snooze ${alarm.snooze.minutes} min${snoozesLeft > 1 ? ` · ${snoozesLeft} left` : ' · last one'}`}
            variant="secondary"
            onPress={snoozeNow}
          />
        ) : null}
        {alarm.mode === 'deep' || ring.source === 'recheck' ? (
          <HoldButton title="Hold to stop" holdMs={1500} accent={accent} onDone={stopNow} />
        ) : (
          <Button title="Stop" accent={accent} onPress={stopNow} style={styles.stop} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  top: { alignItems: 'center', gap: space.md, marginTop: space.xxl },
  pulseBox: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 2 },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  clock: { fontSize: 84, lineHeight: 98, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -3 },
  period: { fontSize: 24, lineHeight: 30, fontWeight: '500', color: colors.textMuted },
  center: { textAlign: 'center' },
  actions: { gap: space.md },
  stop: { height: 64 },
});
