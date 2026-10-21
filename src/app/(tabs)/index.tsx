import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useTabBarSpace } from '@/components/tabBarSpace';
import { AlarmTags } from '@/components/ModeBadge';
import { Button, Card, PressableScale, Txt, type IconName } from '@/components/ui';
import { NewsFeed, NewsPrompt } from '@/components/NewsFeed';
import { WeatherHero } from '@/components/WeatherHero';
import { nextRing, sleepAdvice } from '@/core/next';
import { formatDuration, minutesAsleep } from '@/core/sleep';
import { HOUR, formatClock, formatClockText, formatSpan } from '@/core/time';
import { FREE_NEWS_TOPICS, trialJustEnded } from '@/core/pro';
import { balance, levelOf, nextReward } from '@/core/xp';
import { useAuth } from '@/state/auth';
import { usePro } from '@/state/usePro';
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
  const { pro, status } = usePro();
  // The free plan reads its first few follows (topics and names together).
  const allFollows = data.settings.newsTopics;
  const entityCount = data.settings.news.entities.length;
  const newsFollows = useMemo(() => (pro ? (allFollows ?? []) : (allFollows ?? []).slice(0, Math.max(0, FREE_NEWS_TOPICS - entityCount))), [pro, allFollows, entityCount]);
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
  // Ryz needs an account: when you're signed out (or new), the welcome screen comes back.
  const auth = useAuth();
  const signedOut = auth.enabled && auth.checked && !auth.session;
  const askWelcome = ready && (!data.settings.onboarded || signedOut);
  const [pulling, setPulling] = useState(false);
  const onRefresh = () => {
    setPulling(true);
    pullToRefresh().finally(() => setPulling(false));
  };
  useEffect(() => {
    // First launch: welcome, account, news topics and goals. After that, only to log back in.
    if (askWelcome) router.push('/welcome');
  }, [askWelcome]);
  // When the trial runs out, say so once, with what Pro was doing for you.
  const trialEnded = ready && trialJustEnded(data, now);
  useEffect(() => {
    if (trialEnded) router.push({ pathname: '/pro', params: { feature: 'trial_ended' } });
  }, [trialEnded]);
  const reward = nextReward(data);
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
        {status.kind === 'trial' ? (
          <PressableScale onPress={() => router.push('/pro')} style={[styles.trial, status.daysLeft <= 3 && styles.trialEnding]} accessibilityLabel={`Pro trial, ${status.daysLeft} days left. See plans`}>
            <Ionicons name="diamond" size={20} color={status.daysLeft <= 3 ? colors.onAccent : colors.text} />
            <View style={styles.flex}>
              <Txt variant="heading" style={status.daysLeft <= 3 ? styles.onAccent : undefined}>
                {status.daysLeft <= 3 ? `Your Pro trial ends in ${status.daysLeft} ${status.daysLeft === 1 ? 'day' : 'days'}` : `Pro trial · ${status.daysLeft} days left`}
              </Txt>
              <Txt variant="caption" style={status.daysLeft <= 3 ? styles.onAccentMuted : undefined}>
                {status.daysLeft <= 3 ? 'Keep every mission, sound and stat with Pro.' : 'Every mission, sound and stat is unlocked. No card needed.'}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={status.daysLeft <= 3 ? colors.onAccent : colors.textFaint} />
          </PressableScale>
        ) : !pro && reward ? (
          <PressableScale onPress={() => router.push('/xp')} style={styles.trial} accessibilityLabel={`${reward.have} of ${reward.item.cost} XP toward ${reward.item.title}`}>
            <Ionicons name="star-outline" size={20} color={colors.text} />
            <View style={styles.flex}>
              <Txt variant="heading">{`${reward.have.toLocaleString()} / ${reward.item.cost.toLocaleString()} XP to ${reward.item.title}`}</Txt>
              <View style={styles.rewardTrack}>
                <View style={[styles.rewardFill, { width: `${Math.min(100, (reward.have / reward.item.cost) * 100)}%` }]} />
              </View>
            </View>
          </PressableScale>
        ) : null}
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

        {newsFollows.length > 0 || data.settings.news.entities.length > 0 ? <NewsFeed follows={newsFollows} /> : ready ? <NewsPrompt /> : null}

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
  trial: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md + 4, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  trialEnding: { backgroundColor: colors.accent, borderColor: colors.accent },
  onAccent: { color: colors.onAccent },
  onAccentMuted: { color: '#3A3A3C' },
  rewardTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: space.sm },
  rewardFill: { height: '100%', backgroundColor: colors.text },
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
