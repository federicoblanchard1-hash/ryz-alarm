import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/Sheet';
import { SleepChart } from '@/components/SleepChart';
import { useTabBarSpace } from '@/components/tabBarSpace';
import { TimePicker } from '@/components/TimePicker';
import { Button, Chips, Segmented, Txt, haptic } from '@/components/ui';
import { nextRing, sleepAdvice } from '@/core/next';
import { RATINGS, addRecord, endSleep, formatDuration, lastNights, manualRecord, minutesAsleep, recent, sleepStats, startSleep, wrapDay } from '@/core/sleep';
import { formatClockText } from '@/core/time';
import type { SleepRecord } from '@/core/types';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

const RANGES = [
  { value: 7, label: 'Week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: 'Month' },
];
const DATE = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
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
function insight(stats: NonNullable<ReturnType<typeof sleepStats>>, goal: number): { title: string; text: string } {
  if (stats.averageMinutes < 7 * 60) {
    return { title: 'Under 7 hours', text: 'Adults need 7 hours or more a night (AASM & SRS, 2015). An earlier bedtime is the easiest place to find it.' };
  }
  if (stats.nights >= 3 && stats.wakeSpread > 45) {
    return {
      title: 'Your mornings move around',
      text: `Your wake-up time varies by about ${Math.round(stats.wakeSpread)} min. Regular sleep times are linked with better long-term health, even more than total sleep (Windred et al., 2024).`,
    };
  }
  if (stats.averageMinutes < goal - 20) {
    return { title: 'A little short of your goal', text: `You're averaging ${formatDuration(goal - stats.averageMinutes)} less than your goal. Fifteen minutes earlier each night adds up.` };
  }
  return { title: 'Steady and rested', text: 'Enough sleep at regular times: keep the same wake-up time on weekends too.' };
}

export default function SleepScreen() {
  const { data, update } = useStore();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const now = useNow(30_000);
  const [range, setRange] = useState(7);
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { use24h, sleepGoalMinutes: goal } = data.settings;

  const shown = recent(data.sleep, now, range);
  const stats = sleepStats(shown, goal);
  const slots = lastNights(data.sleep, now, range);
  const picked = slots.find((s) => s.day === selected)?.record ?? null;
  const next = nextRing(data, now);
  const advice = next ? sleepAdvice(next.at, now, goal, use24h) : null;
  const sleeping = data.sleepingSince !== null;

  const start = () => {
    haptic('success');
    setNote(null);
    update((d, t) => startSleep(d, t));
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

  const avgBed = stats ? wrapDay(stats.averageBed) : null;
  const avgWake = stats ? wrapDay(stats.averageWake) : null;
  const tip = stats ? insight(stats, goal) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabSpace + space.xl }]}>
        <View style={styles.header}>
          <Txt variant="largeTitle" accessibilityRole="header">Sleep</Txt>
          <Pressable onPress={() => setAdding(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Add a night" style={styles.add}>
            <Ionicons name="add" size={28} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.session, sleeping && styles.sessionOn]}>
          <Ionicons name={sleeping ? 'moon' : 'moon-outline'} size={28} color={colors.text} />
          {sleeping && data.sleepingSince !== null ? (
            <>
              <Text style={styles.elapsed}>{formatDuration((now - data.sleepingSince) / 60_000)}</Text>
              <Txt variant="muted">{`Asleep since ${clock(data.sleepingSince, use24h)}. Stopping your alarm ends it, or tap below.`}</Txt>
              <Button title="I'm awake" icon="sunny-outline" onPress={wake} />
            </>
          ) : (
            <>
              <Txt variant="heading">Going to bed?</Txt>
              <Txt variant="muted">{advice ?? 'Start tracking when you lie down. Ryz ends it when you stop your alarm.'}</Txt>
              <Button title="Start sleep" icon="bed-outline" onPress={start} />
              {note ? <Txt variant="caption">{note}</Txt> : null}
            </>
          )}
        </View>

        <Segmented label="Range" value={range} onChange={(v) => { setRange(v); setSelected(null); }} options={RANGES} />

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

            <View style={styles.chartCard}>
              <Txt variant="caption" style={styles.detail} accessibilityLiveRegion="polite">
                {picked
                  ? `${DATE.format(picked.end)} · ${formatDuration(minutesAsleep(picked))} · ${clock(picked.start, use24h)} – ${clock(picked.end, use24h)}${picked.rating ? ` · ${RATINGS[picked.rating - 1].label}` : ''}`
                  : 'Hours slept each night. Tap one for details.'}
              </Txt>
              <SleepChart slots={slots} goalMinutes={goal} selected={selected} onSelect={setSelected} />
            </View>

            <View style={styles.tiles}>
              <Tile label="Bedtime" value={avgBed ? formatClockText(avgBed.hour, avgBed.minute, use24h) : '–'} note="on average" />
              <Tile label="Wake-up" value={avgWake ? formatClockText(avgWake.hour, avgWake.minute, use24h) : '–'} note="on average" />
              <Tile
                label="Regularity"
                value={stats.nights < 3 ? '–' : `±${Math.round(stats.wakeSpread)} min`}
                note={stats.nights < 3 ? 'after 3 nights' : stats.wakeSpread <= 30 ? 'steady mornings' : 'mornings vary'}
              />
              <Tile
                label={stats.debtMinutes > 0 ? 'Sleep debt' : 'Extra sleep'}
                value={formatDuration(Math.abs(stats.debtMinutes))}
                note={stats.rating ? `felt ${RATINGS[Math.round(stats.rating) - 1].label.toLowerCase()}` : 'vs your goal'}
              />
            </View>

            {tip ? (
              <View style={styles.insight}>
                <Ionicons name="flask-outline" size={20} color={colors.text} />
                <View style={styles.flex}>
                  <Txt variant="heading">{tip.title}</Txt>
                  <Txt variant="caption">{tip.text}</Txt>
                </View>
              </View>
            ) : null}

            <Txt variant="section" style={styles.listTitle}>Nights</Txt>
            <View style={styles.list}>
              {[...shown].reverse().map((r, i) => (
                <Pressable key={r.id} onLongPress={() => remove(r)} accessibilityHint="Long press to delete" style={[styles.night, i > 0 && styles.nightBorder]}>
                  <View style={styles.flex}>
                    <Txt variant="row">{DATE.format(r.end)}</Txt>
                    <Txt variant="caption">{`${clock(r.start, use24h)} – ${clock(r.end, use24h)}${r.rating ? ` · ${RATINGS[r.rating - 1].label}` : ''}`}</Txt>
                  </View>
                  <Text style={styles.nightValue}>{formatDuration(minutesAsleep(r))}</Text>
                </Pressable>
              ))}
            </View>
            <Txt variant="caption" style={styles.center}>Long press a night to delete it.</Txt>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={32} color={colors.textMuted} />
            <Txt variant="heading">No nights yet</Txt>
            <Txt variant="muted" style={styles.center}>Tap Start sleep tonight, or add last night with +. Your averages, regularity and sleep debt show up here.</Txt>
          </View>
        )}
      </ScrollView>

      <AddNight visible={adding} onClose={() => setAdding(false)} use24h={use24h} onSave={(r) => update((d) => ({ ...d, sleep: addRecord(d.sleep.filter((x) => x.id !== r.id), r) }))} />
    </View>
  );
}

function AddNight({ visible, onClose, onSave, use24h }: { visible: boolean; onClose: () => void; onSave: (r: SleepRecord) => void; use24h: boolean }) {
  const [daysAgo, setDaysAgo] = useState(0);
  const [bed, setBed] = useState({ hour: 23, minute: 0 });
  const [wake, setWake] = useState({ hour: 7, minute: 0 });
  const [rating, setRating] = useState<SleepRecord['rating']>(undefined);
  const [now] = useState(() => Date.now());
  const record = manualRecord(now - daysAgo * DAY, bed, wake);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add a night"
      footer={
        <Button
          title={record ? `Save · ${formatDuration(minutesAsleep(record))}` : 'Check the times'}
          disabled={!record}
          onPress={() => {
            if (!record) return;
            haptic('success');
            onSave({ ...record, rating });
            onClose();
          }}
        />
      }
    >
      <Chips
        title="Woke up"
        value={daysAgo}
        onChange={setDaysAgo}
        options={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n === 0 ? 'Today' : n === 1 ? 'Yesterday' : DATE.format(now - n * DAY) }))}
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
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.md },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  center: { textAlign: 'center' },
  session: { gap: space.sm, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface },
  sessionOn: { borderWidth: 1, borderColor: colors.borderStrong },
  elapsed: { fontSize: 44, lineHeight: 50, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'] },
  hero: { gap: 2, paddingHorizontal: space.xs },
  heroValue: { fontSize: 52, lineHeight: 60, fontFamily: FONT.light, color: colors.text, letterSpacing: -1 },
  chartCard: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: space.md },
  detail: { minHeight: 18, marginBottom: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexBasis: '48%', flexGrow: 1, gap: 2, padding: space.lg, borderRadius: radius.md + 4, backgroundColor: colors.surface },
  tileValue: { fontSize: 24, lineHeight: 30, fontFamily: FONT.regular, color: colors.text },
  insight: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md + 4, borderWidth: 1, borderColor: colors.border },
  listTitle: { marginTop: space.sm, marginLeft: space.xs },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: space.lg },
  night: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 60 },
  nightBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  nightValue: { fontSize: 17, fontFamily: FONT.regular, color: colors.text, fontVariant: ['tabular-nums'] },
  emptyState: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.lg },
});
