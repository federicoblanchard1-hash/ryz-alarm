import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlarmRow } from '@/components/AlarmRow';
import { ModeBadge } from '@/components/ModeBadge';
import { Button, Card, IconButton, Txt } from '@/components/ui';
import { defaultAlarmFor } from '@/core/ring';
import { HOUR, MINUTE, formatClock, formatClockText, formatHours, formatSpan, nextOccurrence } from '@/core/time';
import type { Alarm, AppData } from '@/core/types';
import { sortedAlarms, useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { colors, space } from '@/theme';

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** The soonest thing that will ring: an alarm or a snooze. */
function nextRing(data: AppData, now: number): { at: number; alarm: Alarm; snoozed: boolean } | null {
  let best: { at: number; alarm: Alarm; snoozed: boolean } | null = null;
  for (const alarm of data.alarms) {
    const at = nextOccurrence(alarm, now);
    if (at !== null && (!best || at < best.at)) best = { at, alarm, snoozed: false };
  }
  for (const event of data.pending) {
    const alarm = defaultAlarmFor(data, event.alarmId);
    if (event.kind === 'snooze' && event.at > now && alarm && (!best || event.at < best.at)) best = { at: event.at, alarm, snoozed: true };
  }
  return best;
}

function sleepAdvice(at: number, now: number, goalMinutes: number, use24h: boolean): string | null {
  if (at - now > 24 * HOUR) return null;
  const bedtime = at - goalMinutes * MINUTE;
  if (now < bedtime) {
    const d = new Date(bedtime);
    return `Be in bed by ${formatClockText(d.getHours(), d.getMinutes(), use24h)} for ${formatHours(goalMinutes)} of sleep.`;
  }
  // Under an hour left it's a nap or the morning, not a night to plan.
  return at - now >= HOUR ? `You can still get ${formatSpan(at - now)} of sleep. Head to bed soon.` : null;
}

export default function Home() {
  const { data, ready, setEnabled } = useStore();
  const permissions = usePermissions();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { use24h, sleepGoalMinutes } = data.settings;
  const next = nextRing(data, now);
  const alarms = sortedAlarms(data.alarms);
  const needsPermission = permissions.supported && permissions.state !== null && permissions.state.notifications !== 'granted' && alarms.length > 0;
  const awakeCheck = data.pending.find((e) => e.kind === 'awakeCheck' && e.at > now);
  const nextDate = next ? new Date(next.at) : null;
  const nextClock = nextDate ? formatClock(nextDate.getHours(), nextDate.getMinutes(), use24h) : null;
  const advice = next && !next.snoozed ? sleepAdvice(next.at, now, sleepGoalMinutes, use24h) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Txt variant="title">Ryz</Txt>
        <IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}>
        {needsPermission ? (
          <Card style={styles.warning}>
            <View style={styles.warningRow}>
              <Ionicons name="notifications-off-outline" size={22} color={colors.danger} />
              <Txt variant="body" style={styles.flex}>
                Notifications are off, so alarms can only ring while Ryz is open.
              </Txt>
            </View>
            <Button title={permissions.state?.notifications === 'denied' ? 'Open Settings' : 'Allow notifications'} onPress={permissions.fix} variant="danger" />
          </Card>
        ) : null}

        {next && nextClock ? (
          <Card style={styles.next}>
            <Txt variant="label">{next.snoozed ? 'Snoozed until' : 'Next alarm'}</Txt>
            <View style={styles.nextClockRow}>
              <Txt style={styles.nextClock}>{nextClock.time}</Txt>
              {nextClock.period ? <Txt style={styles.nextPeriod}>{nextClock.period}</Txt> : null}
            </View>
            <Txt variant="muted">Rings in {formatSpan(next.at - now)}{next.alarm.label ? ` · ${next.alarm.label}` : ''}</Txt>
            <ModeBadge mode={next.alarm.mode} />
            {advice ? (
              <View style={styles.advice}>
                <Ionicons name="moon-outline" size={18} color={colors.textMuted} />
                <Txt variant="caption" style={styles.flex}>{advice}</Txt>
              </View>
            ) : null}
          </Card>
        ) : null}

        {awakeCheck ? (
          <Card style={styles.inline}>
            <Ionicons name="help-circle-outline" size={20} color={colors.gentle} />
            <Txt variant="caption" style={styles.flex}>
              {`Ryz will ask if you're awake at ${formatClockText(new Date(awakeCheck.at).getHours(), new Date(awakeCheck.at).getMinutes(), use24h)}.`}
            </Txt>
          </Card>
        ) : null}

        {ready && alarms.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="alarm-outline" size={44} color={colors.textFaint} />
            <Txt variant="heading">No alarms yet</Txt>
            <Txt variant="muted" style={styles.center}>
              Pick Gentle for a melody that fades in, or Deep sleeper for the low tone that wakes heavy sleepers.
            </Txt>
          </View>
        ) : (
          <View style={styles.list}>
            {alarms.map((alarm) => (
              <AlarmRow
                key={alarm.id}
                alarm={alarm}
                use24h={use24h}
                onPress={() => router.push({ pathname: '/alarm/[id]', params: { id: alarm.id } })}
                onToggle={(enabled) => setEnabled(alarm.id, enabled)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button title="Add alarm" icon="add" onPress={() => router.push({ pathname: '/alarm/[id]', params: { id: 'new' } })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  content: { paddingHorizontal: space.lg, gap: space.md, paddingTop: space.sm },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  warning: { gap: space.md, paddingVertical: space.lg, borderWidth: 1, borderColor: colors.dangerSoft },
  warningRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  next: { paddingVertical: space.lg, gap: space.xs },
  nextClockRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  nextClock: { fontSize: 72, lineHeight: 84, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  nextPeriod: { fontSize: 22, lineHeight: 28, fontWeight: '500', color: colors.textMuted },
  advice: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  list: { gap: space.md },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl * 2, paddingHorizontal: space.xl },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.bg,
  },
});
