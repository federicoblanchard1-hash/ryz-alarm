import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlarmTags } from '@/components/ModeBadge';
import { Button, Card, PressableScale, Txt, haptic, type IconName } from '@/components/ui';
import { WeatherHero } from '@/components/WeatherHero';
import { nextRing, sleepAdvice } from '@/core/next';
import { scheduleTest } from '@/core/ring';
import { HOUR, MINUTE, formatClock, formatClockText, formatHours, formatSpan } from '@/core/time';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { colors, radius, space } from '@/theme';

function Tile({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  return (
    // PressableScale styles its inner view, so the outer one takes the row's share.
    <View style={styles.flex}>
      <PressableScale onPress={onPress} style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
        <Ionicons name={icon} size={20} color={colors.text} />
        <View>
          <Txt style={styles.tileValue} numberOfLines={1}>{value}</Txt>
          <Txt variant="caption" numberOfLines={1}>{label}</Txt>
        </View>
      </PressableScale>
    </View>
  );
}

export default function Home() {
  const { data, ready, update } = useStore();
  const permissions = usePermissions();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { use24h, sleepGoalMinutes } = data.settings;
  const next = nextRing(data, now);
  const nextDate = next ? new Date(next.at) : null;
  const clock = nextDate ? formatClock(nextDate.getHours(), nextDate.getMinutes(), use24h) : null;
  const advice = next && !next.snoozed ? sleepAdvice(next.at, now, sleepGoalMinutes, use24h) : null;
  const bedtime = next && next.at - now <= 24 * HOUR ? new Date(next.at - sleepGoalMinutes * MINUTE) : null;
  const awakeCheck = data.pending.find((e) => e.kind === 'awakeCheck' && e.at > now);
  const needsPermission = permissions.supported && permissions.state !== null && permissions.state.notifications !== 'granted' && data.alarms.length > 0;

  return (
    <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
      <WeatherHero />

      <View style={styles.content}>
        {needsPermission ? (
          <Card style={styles.warning}>
            <View style={styles.warningRow}>
              <Ionicons name="notifications-off-outline" size={22} color={colors.danger} />
              <Txt variant="body" style={styles.flex}>Notifications are off, so alarms can only ring while Ryz is open.</Txt>
            </View>
            <Button title={permissions.state?.notifications === 'denied' ? 'Open Settings' : 'Allow notifications'} onPress={permissions.fix} variant="danger" />
          </Card>
        ) : null}

        {next && clock ? (
          <PressableScale
            onPress={() => router.push({ pathname: '/alarm/[id]', params: { id: next.alarm.id } })}
            style={styles.next}
            accessibilityLabel={`${next.snoozed ? 'Snoozed until' : 'Next alarm'} ${clock.time} ${clock.period}, in ${formatSpan(next.at - now)}. Edit`}
          >
            <View style={styles.nextTop}>
              <Txt variant="label">{next.snoozed ? 'Snoozed until' : 'Next alarm'}</Txt>
              <View style={styles.pill}>
                <Txt style={styles.pillText}>{`in ${formatSpan(next.at - now)}`}</Txt>
              </View>
            </View>
            <View style={styles.clockRow}>
              <Txt style={styles.clock}>{clock.time}</Txt>
              {clock.period ? <Txt style={styles.period}>{clock.period}</Txt> : null}
            </View>
            {next.alarm.label ? <Txt variant="muted">{next.alarm.label}</Txt> : null}
            <AlarmTags alarm={next.alarm} />
            {advice ? (
              <View style={styles.advice}>
                <Ionicons name="moon-outline" size={18} color={colors.textMuted} />
                <Txt variant="caption" style={styles.flex}>{advice}</Txt>
              </View>
            ) : null}
          </PressableScale>
        ) : ready ? (
          <Card style={styles.emptyCard}>
            <Txt variant="heading">No alarm set</Txt>
            <Txt variant="muted">Pick how you want to wake up, and add a mission to make sure you do.</Txt>
            <Button title="Set an alarm" icon="add" onPress={() => router.push({ pathname: '/alarm/[id]', params: { id: 'new' } })} style={styles.emptyButton} />
          </Card>
        ) : null}

        <View style={styles.tiles}>
          <Tile
            icon="bed-outline"
            label="Bedtime"
            value={bedtime ? formatClockText(bedtime.getHours(), bedtime.getMinutes(), use24h) : '—'}
            onPress={() => router.push('/settings')}
          />
          <Tile icon="moon-outline" label="Sleep goal" value={formatHours(sleepGoalMinutes)} onPress={() => router.push('/settings')} />
          <Tile
            icon="alarm-outline"
            label="Test alarm"
            value={permissions.supported ? 'In 1 min' : 'In 5 s'}
            onPress={() => {
              haptic('light');
              update((d, t) => scheduleTest(d, t, permissions.supported ? 60 : 5));
            }}
          />
        </View>

        {awakeCheck ? (
          <Card style={styles.inline}>
            <Ionicons name="help-circle-outline" size={20} color={colors.text} />
            <Txt variant="caption" style={styles.flex}>
              {`Ryz will ask if you're awake at ${formatClockText(new Date(awakeCheck.at).getHours(), new Date(awakeCheck.at).getMinutes(), use24h)}.`}
            </Txt>
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, gap: space.md },
  flex: { flex: 1 },
  warning: { gap: space.md, paddingVertical: space.lg },
  warningRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  next: {
    padding: space.xl,
    gap: space.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  pillText: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.text },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  clock: { fontSize: 64, lineHeight: 74, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  period: { fontSize: 20, lineHeight: 26, fontWeight: '500', color: colors.textMuted },
  advice: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  emptyCard: { padding: space.xl, gap: space.sm },
  emptyButton: { marginTop: space.sm },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tileValue: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
});
