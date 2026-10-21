import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RangeCalendar } from '@/components/RangeCalendar';
import { Sheet } from '@/components/Sheet';
import { SleepChart, bucketLabel } from '@/components/SleepChart';
import { BedtimeSheet, DebtCard, NightSheet, SleepSounds, TagEffects } from '@/components/SleepExtras';
import { useTabBarSpace } from '@/components/tabBarSpace';
import { TimePicker } from '@/components/TimePicker';
import { Button, Chips, Segmented, ThemedSwitch, Txt, haptic } from '@/components/ui';
import { nextRing, sleepAdvice } from '@/core/next';
import {
  RATINGS,
  addRecord,
  between,
  buckets as makeBuckets,
  endSleep,
  formatDuration,
  manualRecord,
  mergeWatchNights,
  minutesAsleep,
  moreStats,
  rateSleep,
  sleepDebt,
  sleepStats,
  startSleep,
  tagEffects,
  tagNight,
  wrapDay,
} from '@/core/sleep';
import { formatClockText } from '@/core/time';
import { addMood, type MoodId } from '@/core/mood';
import { nightsToShow } from '@/core/today';
import type { SleepRecord } from '@/core/types';
import { HEALTH_APP, connectHealth, healthState, readWatchNights, type HealthState } from '@/services/health';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { usePro } from '@/state/usePro';
import { FONT, colors, radius, space } from '@/theme';

type Range = 7 | 14 | 30 | 365 | 'custom';
const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: 'Week' },
  { value: 14, label: '2 wk' },
  { value: 30, label: 'Month' },
  { value: 365, label: 'Year' },
];
const DATE = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const SHORT_DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const DAY = 24 * 60 * 60_000;

function clock(ms: number, use24h: boolean) {
  const d = new Date(ms);
  return formatClockText(d.getHours(), d.getMinutes(), use24h);
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}>
      <Txt variant="caption">{label}</Txt>
      <Text style={styles.tileValue}>{value}</Text>
      {note ? <Txt variant="caption">{note}</Txt> : null}
    </View>
  );
}

/** What the numbers mean, from the research. One message, the most useful one. */
function insight(stats: NonNullable<ReturnType<typeof sleepStats>>, goal: number, jetLag: number | null): { title: string; text: string } {
  if (stats.averageMinutes < 7 * 60) {
    return { title: 'Under 7 hours', text: 'Adults need 7 hours or more a night (AASM & SRS, 2015). An earlier bedtime is the easiest place to find it.' };
  }
  if (stats.nights >= 3 && stats.wakeSpread > 45) {
    return {
      title: 'Your mornings move around',
      text: `Your wake-up time varies by about ${Math.round(stats.wakeSpread)} min. Regular sleep times are linked with better long-term health, even more than total sleep (Windred et al., 2024).`,
    };
  }
  if (jetLag !== null && jetLag > 60) {
    return { title: 'Weekend jet lag', text: `On weekends you sleep about ${formatDuration(jetLag)} later than on weekdays. That shift works like flying across time zones every week (Wittmann et al., 2006). Keep weekend wake-ups within an hour.` };
  }
  if (stats.averageMinutes < goal - 20) {
    return { title: 'A little short of your goal', text: `You're averaging ${formatDuration(goal - stats.averageMinutes)} less than your goal. Fifteen minutes earlier each night adds up.` };
  }
  return { title: 'Steady and rested', text: 'Enough sleep at regular times: keep the same wake-up time on weekends too.' };
}

const WATCH_NOTE: Record<HealthState, string> = {
  ready: 'Your watch records your sleep, and the nights appear here by themselves. You don’t need to press anything.',
  'needs-build': `Automatic sleep reads ${HEALTH_APP}, which needs the full Ryz app (a store or EAS build), not Expo Go. Until then, use the button.`,
  unavailable: `${HEALTH_APP} isn’t available on this phone${Platform.OS === 'android' ? '. Install Health Connect from the Play Store' : ''}. Until then, use the button.`,
  denied: `Ryz isn’t allowed to read your sleep. Allow it in ${HEALTH_APP}, or use the button.`,
};

/** Reads the watch's nights when the Sleep tab opens, if smartwatch mode is on. */
function useWatchSync(on: boolean, onNights: (nights: SleepRecord[], device: string | null) => void) {
  const [state, setState] = useState<HealthState | null>(null);
  const [syncedAt, setSyncedAt] = useState(0);
  const sync = useCallback(async () => {
    if (!on) return;
    const s = await healthState();
    setState(s);
    if (s !== 'ready') return;
    try {
      const { nights, device } = await readWatchNights(Date.now() - 30 * DAY, Date.now());
      onNights(nights, device);
      setSyncedAt(Date.now());
    } catch {
      setState('denied');
    }
  }, [on, onNights]);
  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync]),
  );
  const connect = useCallback(async () => {
    const s = await connectHealth();
    setState(s);
    if (s === 'ready') sync();
  }, [sync]);
  return { state, syncedAt, connect };
}

export default function SleepScreen() {
  const { data, update, updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const now = useNow(30_000);
  const [range, setRange] = useState<Range>(7);
  const [custom, setCustom] = useState<{ from: number | null; to: number | null }>({ from: null, to: null });
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  /** A night whose times are being fixed. */
  const [editing, setEditing] = useState<SleepRecord | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [allStats, setAllStats] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /** The night whose details sheet is open. */
  const [openNight, setOpenNight] = useState<string | null>(null);
  const { use24h, sleepGoalMinutes: goal, smartwatch } = data.settings;

  const onNights = useCallback(
    (nights: SleepRecord[], device: string | null) =>
      update((d) => ({ ...d, sleep: mergeWatchNights(d.sleep, nights), settings: device && device !== d.settings.watchName ? { ...d.settings, watchName: device } : d.settings })),
    [update],
  );
  const [asking, setAsking] = useState(false);
  const { pro, unlock } = usePro();
  // Watch sync is Pro; on the free plan the button works as usual.
  const watchOn = smartwatch && pro;
  const watch = useWatchSync(watchOn, onNights);
  const automatic = watchOn && watch.state === 'ready';

  const toDay = range === 'custom' ? (custom.to ?? custom.from ?? now) : now;
  const fromDay = range === 'custom' ? (custom.from ?? now) : now - (range - 1) * DAY;
  // Until you've tracked three nights, sample ones show what this looks like.
  const { nights: allNights, sample } = nightsToShow(data, now);
  const shown = between(allNights, fromDay, toDay);
  const stats = sleepStats(shown, goal);
  const more = moreStats(shown, goal);
  const columns = makeBuckets(allNights, fromDay, toDay);
  const picked = columns.find((b) => b.start === selected) ?? null;
  const next = nextRing(data, now);
  const advice = next ? sleepAdvice(next.at, now, goal, use24h) : null;
  const sleeping = data.sleepingSince !== null;

  // Start sleep first asks how your day was and checks tomorrow's alarm.
  const [bedtime, setBedtime] = useState(false);
  const start = (mood: MoodId | null) => {
    haptic('success');
    setNote(null);
    setBedtime(false);
    update((d, t) => startSleep(mood ? addMood(d, mood, 'night', t) : d, t));
  };
  const wake = () => {
    haptic('success');
    const short = data.sleepingSince !== null && now - data.sleepingSince < 20 * 60_000;
    setNote(short ? 'That was under 20 minutes, so it wasn’t saved as a night.' : null);
    update((d, t) => endSleep(d, t).data);
  };
  const remove = (r: SleepRecord) => {
    const go = () => update((d) => ({ ...d, sleep: d.sleep.filter((x) => x.id !== r.id) }));
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Delete this night?')) go();
    } else Alert.alert('Delete this night?', `${DATE.format(r.end)} · ${formatDuration(minutesAsleep(r))}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };
  const toggleWatch = (on: boolean) => {
    if (on && !pro) return unlock('smartwatch');
    haptic('select');
    // The first time, ask before Ryz connects to your watch's sleep data.
    if (on && !data.settings.watchConsent) return setAsking(true);
    updateSettings({ smartwatch: on });
    if (on) watch.connect();
  };
  const acceptWatch = () => {
    haptic('success');
    setAsking(false);
    updateSettings({ smartwatch: true, watchConsent: true });
    watch.connect();
  };

  const avgBed = stats ? wrapDay(stats.averageBed) : null;
  const avgWake = stats ? wrapDay(stats.averageWake) : null;
  const tip = stats ? insight(stats, goal, more?.socialJetLag ?? null) : null;
  // Newest first, whatever order the nights arrived in (button, typed in, or a watch).
  const nights = [...shown].sort((a, b) => b.end - a.end);
  const effects = tagEffects(allNights);
  const tagged = allNights.filter((r) => r.tags?.length).length;
  const nightOpen = openNight ? (data.sleep.find((r) => r.id === openNight) ?? null) : null;
  const rangeLabel = range === 'custom' && custom.from !== null ? `${SHORT_DATE.format(custom.from)} – ${SHORT_DATE.format(custom.to ?? custom.from)}` : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabSpace + space.xl }]}>
        <View style={styles.header}>
          <Txt variant="largeTitle" accessibilityRole="header">Sleep</Txt>
          <Pressable onPress={() => setAdding(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Add a night" style={styles.add}>
            <Ionicons name="add" size={28} color={colors.text} />
          </Pressable>
        </View>

        {sample ? (
          <View style={styles.sampleNote}>
            <Ionicons name="eye-outline" size={18} color={colors.textMuted} />
            <Txt variant="caption" style={styles.flex}>Sample nights, to show what Sleep looks like. They go away once you’ve tracked 3 of your own.</Txt>
            <Pressable onPress={() => updateSettings({ sampleSleep: false })} hitSlop={10} accessibilityRole="button">
              <Text style={styles.hide}>Hide</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.session, sleeping && styles.sessionOn]}>
          <View style={styles.watchRow}>
            <Ionicons name="watch-outline" size={22} color={colors.text} />
            <View style={styles.flex}>
              <Txt variant="heading">Smartwatch</Txt>
              <Txt variant="caption">{watchOn ? (automatic && data.settings.watchName ? `Connected to Ryz` : `Automatic from ${HEALTH_APP}`) : pro ? 'Off: use the button below' : 'Pro: nights arrive by themselves'}</Txt>
            </View>
            <ThemedSwitch value={watchOn} onChange={toggleWatch} label="I sleep with a smartwatch" />
          </View>
          <View style={styles.divider} />

          {watchOn ? (
            <View style={styles.watchNote}>
              {automatic && data.settings.watchName ? (
                <View style={styles.connected}>
                  <View style={styles.connectedDot} />
                  <Text style={styles.connectedText} numberOfLines={1}>{data.settings.watchName}</Text>
                  <Txt variant="caption">{HEALTH_APP}</Txt>
                </View>
              ) : null}
              <Txt variant="muted">{WATCH_NOTE[watch.state ?? 'ready']}</Txt>
              {watch.state === 'denied' ? <Button title="Open settings" variant="secondary" icon="settings-outline" onPress={() => Linking.openSettings()} /> : null}
              {automatic && watch.syncedAt > 0 ? <Txt variant="caption">{`Synced at ${clock(watch.syncedAt, use24h)}`}</Txt> : null}
            </View>
          ) : null}

          {sleeping && data.sleepingSince !== null ? (
            <>
              <Text style={styles.elapsed}>{formatDuration((now - data.sleepingSince) / 60_000)}</Text>
              <Txt variant="muted">{`Asleep since ${clock(data.sleepingSince, use24h)}. Stopping your alarm ends it, or tap below.`}</Txt>
              <Button title="I'm awake" icon="sunny-outline" onPress={wake} />
            </>
          ) : (
            <>
              {!automatic ? <Txt variant="heading">Going to bed?</Txt> : null}
              {!automatic ? <Txt variant="muted">{advice ?? 'Tap Start sleep when you lie down. Ryz ends it when you stop your alarm.'}</Txt> : null}
              <Button title="Start sleep" icon="bed-outline" onPress={() => setBedtime(true)} disabled={automatic} variant={automatic ? 'secondary' : 'primary'} />
              {automatic ? <Txt variant="caption" style={styles.center}>Not wearing your watch tonight? Turn Smartwatch off to use the button.</Txt> : null}
              {note ? <Txt variant="caption">{note}</Txt> : null}
            </>
          )}
        </View>

        <SleepSounds />

        <View style={styles.rangeRow}>
          <View style={styles.flex}>
            <Segmented
              label="Range"
              value={range === 'custom' ? 0 : range}
              onChange={(v) => {
                if (v === 365 && !pro) return unlock('sleep_history');
                setRange(v as Range);
                setSelected(null);
                setShowAll(false);
              }}
              options={RANGES.map((r) => ({ value: r.value as number, label: r.label }))}
            />
          </View>
          <Pressable onPress={() => (pro ? setPicking(true) : unlock('sleep_history'))} accessibilityRole="button" accessibilityLabel={pro ? 'Pick dates' : 'Pick dates (Pro)'} style={[styles.calendarButton, range === 'custom' && styles.calendarOn]}>
            <Ionicons name="calendar-outline" size={20} color={range === 'custom' ? colors.onAccent : colors.text} />
          </Pressable>
        </View>
        {rangeLabel ? (
          <Pressable onPress={() => setRange(7)} accessibilityRole="button" accessibilityLabel={`${rangeLabel}. Clear dates`} style={styles.rangeChip}>
            <Txt variant="caption" style={styles.rangeChipText}>{rangeLabel}</Txt>
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {stats ? (
          <>
            <View style={styles.hero}>
              <Txt variant="caption">{`Average a night · ${stats.nights} ${stats.nights === 1 ? 'night' : 'nights'}`}</Txt>
              <Text style={styles.heroValue}>{formatDuration(stats.averageMinutes)}</Text>
              <Txt variant="muted">
                {Math.abs(stats.averageMinutes - goal) < 10
                  ? `Right on your ${formatDuration(goal)} goal`
                  : stats.averageMinutes < goal
                    ? `${formatDuration(goal - stats.averageMinutes)} under your ${formatDuration(goal)} goal`
                    : `${formatDuration(stats.averageMinutes - goal)} over your ${formatDuration(goal)} goal`}
              </Txt>
            </View>

            <DebtCard debt={sleepDebt(allNights, goal, now)} />

            <View style={styles.chartCard}>
              <Txt variant="caption" style={styles.detail} accessibilityLiveRegion="polite">
                {picked && picked.minutes !== null
                  ? picked.size === 'night' && picked.nights[0]
                    ? `${bucketLabel(picked)} · ${formatDuration(picked.minutes)} · ${clock(picked.nights[0].start, use24h)} – ${clock(picked.nights[0].end, use24h)}${picked.nights[0].rating ? ` · ${RATINGS[picked.nights[0].rating - 1].label}` : ''}`
                    : `${bucketLabel(picked)} · ${formatDuration(picked.minutes)} average · ${picked.nights.length} ${picked.nights.length === 1 ? 'night' : 'nights'}`
                  : columns[0]?.size === 'night'
                    ? 'Hours slept each night. Tap one for details.'
                    : `Average a night, by ${columns[0]?.size}. Tap one for details.`}
              </Txt>
              <SleepChart buckets={columns} goalMinutes={goal} selected={selected} onSelect={setSelected} />
            </View>

            <View style={styles.tiles}>
              <Tile label="Bedtime" value={avgBed ? formatClockText(avgBed.hour, avgBed.minute, use24h) : '–'} note={more && stats.nights > 2 ? `±${Math.round(more.bedSpread)} min` : 'on average'} />
              <Tile label="Wake-up" value={avgWake ? formatClockText(avgWake.hour, avgWake.minute, use24h) : '–'} note={stats.nights > 2 ? `±${Math.round(stats.wakeSpread)} min` : 'on average'} />
              <Tile label="Regularity" value={stats.nights < 3 ? '–' : stats.wakeSpread <= 30 ? 'Steady' : stats.wakeSpread <= 60 ? 'Fair' : 'Irregular'} note={stats.nights < 3 ? 'after 3 nights' : 'how much wake time moves'} />
              <Tile label={stats.debtMinutes > 0 ? 'Sleep debt' : 'Extra sleep'} value={formatDuration(Math.abs(stats.debtMinutes))} note="vs your goal" />
              {allStats && more ? <Tile label="Nights on goal" value={`${Math.round(more.onGoal * 100)}%`} note={`${Math.round(more.onGoal * stats.nights)} of ${stats.nights}`} /> : null}
              {allStats && more ? <Tile label="Weekend shift" value={more.socialJetLag === null ? '–' : `${more.socialJetLag >= 0 ? '+' : '−'}${formatDuration(Math.abs(more.socialJetLag))}`} note={more.socialJetLag === null ? 'needs weekdays and weekends' : 'social jet lag'} /> : null}
              {allStats && more ? <Tile label="Longest" value={formatDuration(minutesAsleep(more.longest))} note={SHORT_DATE.format(more.longest.end)} /> : null}
              {allStats && more ? <Tile label="Shortest" value={formatDuration(minutesAsleep(more.shortest))} note={SHORT_DATE.format(more.shortest.end)} /> : null}
              {allStats && stats.rating ? <Tile label="Felt" value={RATINGS[Math.round(stats.rating) - 1].label} note={`${stats.rating.toFixed(1)} out of 5`} /> : null}
            </View>
            {more || stats.rating ? (
              <Pressable onPress={() => setAllStats((v) => !v)} hitSlop={8} accessibilityRole="button" style={styles.moreStats}>
                <Txt variant="caption">{allStats ? 'Fewer stats' : 'More stats'}</Txt>
              </Pressable>
            ) : null}

            {tip ? (
              <View style={styles.insight}>
                <Ionicons name="flask-outline" size={20} color={colors.text} />
                <View style={styles.flex}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Txt variant="caption">{tip.text}</Txt>
                </View>
              </View>
            ) : null}

            <TagEffects effects={effects} tagged={tagged} />

            <Txt variant="section" style={styles.listTitle}>Nights</Txt>
            <View style={styles.list}>
              {(showAll ? nights : nights.slice(0, 14)).map((r, i) => (
                <Pressable key={r.id} disabled={sample} onPress={() => setOpenNight(r.id)} onLongPress={() => remove(r)} accessibilityHint="Tap for details, long press to delete" style={[styles.night, i > 0 && styles.nightBorder]}>
                  <View style={styles.flex}>
                    <Txt variant="row">{DATE.format(r.end)}</Txt>
                    <Txt variant="caption">{`${clock(r.start, use24h)} – ${clock(r.end, use24h)}${r.rating ? ` · ${RATINGS[r.rating - 1].label}` : ''}${r.tags?.length ? ` · ${r.tags.length} ${r.tags.length === 1 ? 'note' : 'notes'}` : ''}`}</Txt>
                  </View>
                  {r.source === 'watch' ? <Ionicons name="watch-outline" size={16} color={colors.textMuted} accessibilityLabel="From your watch" /> : null}
                  <Text style={styles.nightValue}>{formatDuration(minutesAsleep(r))}</Text>
                </Pressable>
              ))}
            </View>
            {nights.length > 14 && !showAll ? <Button title={`Show all ${nights.length} nights`} variant="secondary" onPress={() => setShowAll(true)} /> : null}
            {sample ? null : <Txt variant="caption" style={styles.center}>Tap a night to rate it or note what happened. Long press to delete.</Txt>}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={32} color={colors.textMuted} />
            <Txt variant="heading">{data.sleep.length ? 'No nights in these dates' : 'No nights yet'}</Txt>
            <Txt variant="muted" style={styles.center}>
              {data.sleep.length ? 'Pick other dates, or add a night with +.' : 'Tap Start sleep tonight, turn on Smartwatch, or add last night with +. Averages, regularity and sleep debt show up here.'}
            </Txt>
          </View>
        )}
      </ScrollView>

      <Sheet
        visible={picking}
        onClose={() => setPicking(false)}
        title="Pick dates"
        footer={
          <Button
            title={custom.from !== null ? 'Show these dates' : 'Pick a first day'}
            disabled={custom.from === null}
            onPress={() => {
              setRange('custom');
              setSelected(null);
              setShowAll(false);
              setPicking(false);
            }}
          />
        }
      >
        <RangeCalendar from={custom.from} to={custom.to} max={now} onChange={(from, to) => setCustom({ from, to })} />
      </Sheet>

      <NightSheet
        night={nightOpen}
        onClose={() => setOpenNight(null)}
        onRate={(rating) => nightOpen && update((d) => rateSleep(d, nightOpen.id, rating))}
        onTags={(tags) => nightOpen && update((d) => tagNight(d, nightOpen.id, tags))}
        onDelete={() => {
          const r = nightOpen;
          setOpenNight(null);
          if (r) remove(r);
        }}
        onEdit={() => {
          setEditing(nightOpen);
          setOpenNight(null);
          setAdding(true);
        }}
      />

      <Sheet
        visible={asking}
        onClose={() => setAsking(false)}
        title="Connect your watch?"
        footer={
          <View style={styles.askButtons}>
            <Button title="Accept and connect" icon="watch-outline" onPress={acceptWatch} />
            <Button title="Not now" variant="secondary" onPress={() => setAsking(false)} />
          </View>
        }
      >
        <Txt variant="muted">{`Ryz will read your sleep from ${HEALTH_APP}, which your watch writes to. Nights then show up here by themselves.`}</Txt>
        {[
          { icon: 'moon-outline' as const, text: 'Only when you fell asleep and woke up. Nothing else from your health data.' },
          { icon: 'phone-portrait-outline' as const, text: 'Your nights stay on this phone. Ryz never writes to your watch or Health.' },
          { icon: 'toggle-outline' as const, text: `Turn it off any time here, or remove Ryz in ${HEALTH_APP}.` },
        ].map((p) => (
          <View key={p.icon} style={styles.askPoint}>
            <Ionicons name={p.icon} size={20} color={colors.text} />
            <Txt variant="body" style={styles.flex}>{p.text}</Txt>
          </View>
        ))}
        <Txt variant="caption">{`Next, your phone asks you to allow it: turn on Sleep for Ryz.`}</Txt>
      </Sheet>

      <BedtimeSheet visible={bedtime} onClose={() => setBedtime(false)} onStart={start} />

      <AddNight
        key={editing?.id ?? 'new'}
        visible={adding}
        initial={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        use24h={use24h}
        onSave={(r) => update((d) => ({ ...d, sleep: addRecord(d.sleep.filter((x) => x.id !== r.id && x.id !== editing?.id), r) }))}
      />
    </View>
  );
}

/** Add a night by hand, or fix the times of one (`initial`): a watch that was off, a session started late… */
function AddNight({ visible, onClose, onSave, use24h, initial }: { visible: boolean; onClose: () => void; onSave: (r: SleepRecord) => void; use24h: boolean; initial?: SleepRecord | null }) {
  const [now] = useState(() => Date.now());
  const at = (ms: number) => ({ hour: new Date(ms).getHours(), minute: new Date(ms).getMinutes() });
  const [daysAgo, setDaysAgo] = useState(() => (initial ? Math.max(0, Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(initial.end).setHours(0, 0, 0, 0)) / DAY)) : 0));
  const [bed, setBed] = useState(() => (initial ? at(initial.start) : { hour: 23, minute: 0 }));
  const [wake, setWake] = useState(() => (initial ? at(initial.end) : { hour: 7, minute: 0 }));
  const [rating, setRating] = useState<SleepRecord['rating']>(initial?.rating);
  const record = manualRecord(now - daysAgo * DAY, bed, wake);
  const days = [0, 1, 2, 3, 4, 5, 6];
  if (!days.includes(daysAgo)) days.push(daysAgo);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Edit this night' : 'Add a night'}
      footer={
        <Button
          title={record ? `Save · ${formatDuration(minutesAsleep(record))}` : 'Check the times'}
          disabled={!record}
          onPress={() => {
            if (!record) return;
            haptic('success');
            onSave({ ...record, rating, tags: initial?.tags });
            onClose();
          }}
        />
      }
    >
      <Chips
        title="Woke up"
        value={daysAgo}
        onChange={setDaysAgo}
        options={days.map((n) => ({ value: n, label: n === 0 ? 'Today' : n === 1 ? 'Yesterday' : DATE.format(now - n * DAY) }))}
      />
      <Txt variant="caption">Went to sleep</Txt>
      <TimePicker hour={bed.hour} minute={bed.minute} use24h={use24h} onChange={(hour, minute) => setBed({ hour, minute })} />
      <Txt variant="caption">Woke up</Txt>
      <TimePicker hour={wake.hour} minute={wake.minute} use24h={use24h} onChange={(hour, minute) => setWake({ hour, minute })} />
      <Chips<number> title="How did you feel?" value={rating ?? 0} onChange={(v) => setRating(v === 0 ? undefined : (v as SleepRecord['rating']))} options={[{ value: 0, label: 'Skip' }, ...RATINGS]} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sampleNote: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  hide: { fontSize: 13, fontFamily: FONT.medium, color: colors.text },
  connected: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, alignSelf: 'flex-start' },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759' },
  connectedText: { fontSize: 14, fontFamily: FONT.medium, color: colors.text, flexShrink: 1 },
  askButtons: { gap: space.sm },
  askPoint: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.md },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  center: { textAlign: 'center' },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  watchNote: { gap: space.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space.xs },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  calendarButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  calendarOn: { backgroundColor: colors.accent },
  rangeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: space.md, height: 30, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, marginTop: -space.sm },
  rangeChipText: { color: colors.text },
  session: { gap: space.sm, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface },
  sessionOn: { borderWidth: 1, borderColor: colors.borderStrong },
  elapsed: { fontSize: 44, lineHeight: 50, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'] },
  hero: { gap: 2, paddingHorizontal: space.xs },
  heroValue: { fontSize: 52, lineHeight: 60, fontFamily: FONT.light, color: colors.text, letterSpacing: -1 },
  chartCard: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: space.md },
  detail: { minHeight: 18, marginBottom: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexBasis: '48%', flexGrow: 1, gap: 1, paddingHorizontal: space.md, paddingVertical: space.md - 2, borderRadius: radius.md, backgroundColor: colors.surface },
  tileValue: { fontSize: 20, lineHeight: 26, fontFamily: FONT.regular, color: colors.text },
  tipTitle: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  moreStats: { alignSelf: 'center', paddingVertical: space.xs },
  insight: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  listTitle: { marginTop: space.sm, marginLeft: space.xs },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: space.lg },
  night: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 60 },
  nightBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  nightValue: { fontSize: 17, fontFamily: FONT.regular, color: colors.text, fontVariant: ['tabular-nums'] },
  emptyState: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.lg },
});
