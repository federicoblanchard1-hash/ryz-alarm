import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HoldButton } from '@/components/HoldButton';
import { RingDial } from '@/components/RingDial';
import { Button, Txt, haptic } from '@/components/ui';
import { MISSIONS } from '@/core/missions';
import { phaseAt } from '@/core/plan';
import { endSleep } from '@/core/sleep';
import { applyWake } from '@/core/xp';
import { canSnooze, defaultAlarmFor, findActive, snooze, stop } from '@/core/ring';
import { MINUTE, formatClock, formatClockText } from '@/core/time';
import type { ActiveRing } from '@/core/types';
import { MissionRunner } from '@/missions/MissionRunner';
import { clearDelivered } from '@/services/notifications';
import { useRingSound } from '@/services/sound';
import { useBrightScreen } from '@/state/useBrightScreen';
import { useScreenAwake } from '@/state/useScreenAwake';
import { useStore } from '@/state/store';
import { FONT, colors, space } from '@/theme';

type Ring = Extract<ActiveRing, { type: 'ring' }>;


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
  const [phase, setPhase] = useState<'ringing' | 'missions'>('ringing');
  const [busy, setBusy] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = useClock();
  const insets = useSafeAreaInsets();
  const { missionIdleSeconds, missionTimeLimitSeconds, quietDuringMissions, brightScreen } = data.settings;
  useScreenAwake('ryz-ring');
  useBrightScreen(brightScreen && Boolean(ring && alarm) && !done);
  useRingSound(alarm, ring?.source ?? 'alarm', ring?.at ?? 0, Boolean(ring && alarm) && !done, busy);

  useEffect(() => {
    if (!ring || !alarm) router.replace('/');
    else clearDelivered();
  }, [ring, alarm]);
  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, []);

  /** Silent while you work on a mission; it rings again if you stop for `missionIdleSeconds`. */
  const activity = useCallback(() => {
    if (!quietDuringMissions) return;
    setBusy(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setBusy(false), missionIdleSeconds * 1000);
  }, [quietDuringMissions, missionIdleSeconds]);

  /** Out of time on a mission: it starts over and the alarm rings again until you get going. */
  const timedOut = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setBusy(false);
    haptic('error');
  }, []);

  const snoozeNow = useCallback(() => {
    if (!ring) return;
    setDone(true);
    update((d, t) => snooze(d, ring, t));
    clearDelivered();
    router.replace('/');
  }, [ring, update]);

  // When you first reacted (Stop, or starting the missions): getting up within a minute earns XP.
  const respondedAt = useRef<number | null>(null);
  const finish = useCallback(() => {
    if (!ring) return;
    setDone(true);
    haptic('success');
    const reacted = respondedAt.current ?? Date.now();
    const missionsDone = phase === 'missions' && alarm ? alarm.missions.length : 0;
    // Stopping the alarm also ends a running sleep session, and earns XP for the morning.
    update((d, t) => {
      const awarded = alarm ? applyWake(d, ring, alarm, reacted, missionsDone, t) : d;
      return endSleep(stop(awarded, ring, t), t).data;
    });
    clearDelivered();
    // A nap isn't a morning: go straight back.
    router.replace(alarm?.quick ? '/' : '/morning');
  }, [ring, alarm, phase, update]);

  const startMissions = () => {
    respondedAt.current ??= Date.now();
    haptic('light');
    setPhase('missions');
    activity();
  };

  // Nobody touched it for the whole ring: snooze if allowed, otherwise keep ringing.
  useEffect(() => {
    if (!ring || !alarm || phase !== 'ringing' || !canSnooze(alarm, ring)) return;
    const timer = setTimeout(snoozeNow, Math.max(0, ring.at + alarm.ringMinutes * MINUTE - Date.now()));
    return () => clearTimeout(timer);
  }, [ring, alarm, phase, snoozeNow]);

  if (!ring || !alarm) return <View style={styles.screen} />;

  const clock = formatClock(new Date(now).getHours(), new Date(now).getMinutes(), data.settings.use24h);
  const hasMissions = alarm.missions.length > 0;

  if (phase === 'missions') {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.missions, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.bar}>
            <Txt variant="heading">{formatClockText(new Date(now).getHours(), new Date(now).getMinutes(), data.settings.use24h)}</Txt>
            <Txt variant="caption" accessibilityLiveRegion="polite">{!quietDuringMissions ? 'Finish to turn it off' : busy ? 'Alarm off while you do this' : 'Ringing again. Keep going to silence it'}</Txt>
          </View>
          <MissionRunner missions={alarm.missions} onActivity={activity} onComplete={finish} timeLimitSeconds={missionTimeLimitSeconds} onTimeout={timedOut} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  const deepNow = phaseAt(alarm, ring.source, (now - ring.at) / 1000) === 'deep';
  const snoozesLeft = alarm.snooze.limit - ring.snoozesUsed;
  const subtitle =
    ring.source === 'recheck' ? "You didn't answer — time to get up" : ring.source === 'snooze' ? 'Snooze is over' : alarm.label || 'Good morning';
  const missionNames = alarm.missions.map((m) => MISSIONS[m.type].title).join(' · ');

  return (
    <View style={[styles.screen, styles.ringing, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.top}>
        <RingDial second={new Date(now).getSeconds()}>
          {/* Hours over minutes, big enough to read without glasses. */}
          <View style={styles.stack} accessible accessibilityRole="header" accessibilityLabel={`${clock.time} ${clock.period}`}>
            {clock.time.split(':').map((part, i) => (
              <Txt key={i} style={[styles.digits, i === 1 && styles.minutes]}>{part.padStart(2, '0')}</Txt>
            ))}
            {clock.period ? <Txt style={styles.period}>{clock.period}</Txt> : null}
          </View>
        </RingDial>
        <Txt variant="heading" style={styles.center}>{subtitle}</Txt>
        {deepNow && alarm.mode === 'gentle' && ring.source !== 'recheck' ? <Txt variant="caption" style={styles.center}>Switched to the deep sleeper tone</Txt> : null}
      </View>

      <View style={styles.actions}>
        {canSnooze(alarm, ring) ? (
          <Button title={`Snooze ${alarm.snooze.minutes} min${snoozesLeft > 1 ? ` · ${snoozesLeft} left` : ' · last one'}`} variant="secondary" onPress={snoozeNow} />
        ) : null}
        {hasMissions ? (
          <>
            <Button title="Stop" icon="flash" onPress={startMissions} style={styles.big} />
            <Txt variant="caption" style={styles.center}>{`Finish ${alarm.missions.length > 1 ? 'your missions' : 'your mission'} to turn it off: ${missionNames}`}</Txt>
          </>
        ) : alarm.mode === 'deep' || ring.source === 'recheck' ? (
          <HoldButton title="Hold to stop" holdMs={1500} onDone={finish} />
        ) : (
          <Button title="Stop" onPress={finish} style={styles.big} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  ringing: { paddingHorizontal: space.xl, justifyContent: 'space-between' },
  missions: { flex: 1, paddingHorizontal: space.xl, gap: space.xl },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  top: { alignItems: 'center', gap: space.md, marginTop: space.xxl },
  stack: { alignItems: 'center' },
  digits: { fontSize: 96, lineHeight: 98, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -4 },
  minutes: { color: colors.textMuted },
  period: { fontSize: 15, lineHeight: 20, fontFamily: FONT.medium, color: colors.textMuted, letterSpacing: 2, marginTop: space.xs },
  center: { textAlign: 'center' },
  actions: { gap: space.md },
  big: { height: 64 },
});
