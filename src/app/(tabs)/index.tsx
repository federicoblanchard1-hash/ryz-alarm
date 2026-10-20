import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useTabBarSpace } from '@/components/tabBarSpace';
import { AlarmTags } from '@/components/ModeBadge';
import { Button, Card, PressableScale, Txt, type IconName } from '@/components/ui';
import { NewsFeed, NewsPrompt } from '@/components/NewsFeed';
import { WeatherHero } from '@/components/WeatherHero';
import { nextRing, sleepAdvice } from '@/core/next';
import { formatDuration, minutesAsleep } from '@/core/sleep';
import { HOUR, formatClock, formatClockText, formatSpan } from '@/core/time';
import { balance, levelOf } from '@/core/xp';
import { nearBottom } from '@/state/nearBottom';
import { pullToRefresh } from '@/state/pullToRefresh';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { FONT, colors, radius, space } from '@/theme';

/** A shortcut like Alarmy's: a rounded square holding a value or an icon, with its name below. */
function Tile({ icon, value, label, onPress }: { icon?: IconName; value?: string; label: string; onPress: () => void }) {
  return (
    <View style={styles.tileWrap}>
      <PressableScale onPress={onPress} style={styles.tile} accessibilityLabel={value ? `${label}: ${value}` : label}>
        {value ? (
          <Txt style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Txt>
        ) : (
          <Ionicons name={icon ?? 'ellipse'} size={32} color={colors.text} />
        )}
      </PressableScale>
      <Txt style={styles.tileLabel} numberOfLines={2}>{label}</Txt>
    </View>
  );
}

export default function Home() {
  const { data, ready } = useStore();
  const permissions = usePermissions();
  const tabSpace = useTabBarSpace();
  const now = useNow();
  const { use24h, sleepGoalMinutes } = data.settings;
  const next = nextRing(data, now);
  const nextDate = next ? new Date(next.at) : null;
  const clock = nextDate ? formatClock(nextDate.getHours(), nextDate.getMinutes(), use24h) : null;
  const advice = next && !next.snoozed ? sleepAdvice(next.at, now, sleepGoalMinutes, use24h) : null;
  // The most recent night, if it ended in the last day and a half.
  const lastNight = data.sleep.at(-1)?.end && now - data.sleep.at(-1)!.end < 36 * HOUR ? data.sleep.at(-1)! : null;
  const awakeCheck = data.pending.find((e) => e.kind === 'awakeCheck' && e.at > now);
  const askWelcome = ready && !data.settings.onboarded;
  const [pulling, setPulling] = useState(false);
  const onRefresh = () => {
    setPulling(true);
    pullToRefresh().finally(() => setPulling(false));
  };
  useEffect(() => {
    // First launch: welcome, account, news topics and goals. Once; Settings can change them later.
    if (askWelcome) router.push('/welcome');
  }, [askWelcome]);
  const needsPermission = permissions.supported && permissions.state !== null && permissions.state.notifications !== 'granted' && data.alarms.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: tabSpace + space.xl }}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.onAccent]} progressBackgroundColor={colors.accent} />}
      // Near the end, the news feed shows more stories and then older ones.
      scrollEventThrottle={250}
      onScroll={({ nativeEvent: e }) => {
        if (e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - 900) nearBottom();
      }}
    >
      <WeatherHero>
        <View style={styles.tiles}>
          <Tile label={`XP · level ${levelOf(data.xp.earned).level}`} value={String(balance(data.xp))} onPress={() => router.push('/xp')} />
          <Tile label="Add alarm" icon="add" onPress={() => router.push({ pathname: '/alarm/[id]', params: { id: 'new' } })} />
          <Tile label="Power nap" icon="timer-outline" onPress={() => router.push({ pathname: '/alarms', params: { quick: '1' } })} />
          <Tile
            label="Last night"
            value={lastNight ? formatDuration(minutesAsleep(lastNight)).replace(' min', '').replace(' h ', 'h') : undefined}
            icon="moon-outline"
            onPress={() => router.push('/sleep')}
          />
        </View>
      </WeatherHero>

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
          <PressableScale onPress={() => router.push({ pathname: '/alarm/[id]', params: { id: 'new' } })} style={styles.emptyCard} accessibilityLabel="No alarm set. Set an alarm">
            <View style={styles.emptyIcon}>
              <Ionicons name="add" size={22} color={colors.onAccent} />
            </View>
            <View style={styles.flex}>
              <Txt variant="heading">No alarm set</Txt>
              <Txt variant="caption">Tap to set one</Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
          </PressableScale>
        ) : null}

        {data.settings.newsTopics && data.settings.newsTopics.length > 0 ? <NewsFeed topics={data.settings.newsTopics} /> : ready ? <NewsPrompt /> : null}

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
  content: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md },
  flex: { flex: 1 },
  warning: { gap: space.md, paddingVertical: space.lg },
  warningRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  next: {
    padding: space.xl,
    gap: space.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  pillText: { fontSize: 13, lineHeight: 18, fontFamily: FONT.medium, color: colors.text },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  clock: { fontSize: 64, lineHeight: 74, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  period: { fontSize: 20, lineHeight: 26, fontFamily: FONT.regular, color: colors.textMuted },
  advice: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md + 4, backgroundColor: colors.surface },
  emptyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: space.sm, paddingTop: space.xxl, paddingBottom: space.xl },
  tileWrap: { width: 84, alignItems: 'center', gap: space.sm },
  tile: { width: 68, height: 68, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tileValue: { fontSize: 21, lineHeight: 26, fontFamily: FONT.semibold, color: colors.text, fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 16, lineHeight: 20, fontFamily: FONT.medium, color: colors.text, textAlign: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
});
