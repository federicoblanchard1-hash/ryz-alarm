import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoodIcon, MoodPicker } from '@/components/MoodPicker';
import { Txt } from '@/components/ui';
import { MOOD, addMood, moodAndSleep, moodCounts, moodDay, moodWhen, moodsOn, monthGrid, startOfDay } from '@/core/mood';
import { formatDuration, minutesAsleep } from '@/core/sleep';
import { moodsToShow, nightsToShow } from '@/core/today';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const DAY_TITLE = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** Your moods as a calendar: the big face is the morning, the small one the evening. */
export default function MoodScreen() {
  const { data, update } = useStore();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [picked, setPicked] = useState<number>(() => startOfDay(Date.now()));
  const { moods, sample } = moodsToShow(data, now);
  const { nights } = nightsToShow(data, now);
  const when = moodWhen(now);
  const today = moodDay({ at: now, when });
  const todays = moodsOn(data.moods, today)[when];
  const weeks = monthGrid(month.year, month.month);
  const from = new Date(month.year, month.month, 1).getTime();
  const to = new Date(month.year, month.month + 1, 0).getTime();
  const counts = moodCounts(moods, from, to);
  const link = moodAndSleep(moods, nights, data.settings.sleepGoalMinutes);
  const day = moodsOn(moods, picked);
  const dayNight = nights.find((r) => startOfDay(r.end) === picked);
  const shift = (by: number) => setMonth((m) => ({ year: m.month + by < 0 ? m.year - 1 : m.month + by > 11 ? m.year + 1 : m.year, month: (m.month + by + 12) % 12 }));
  const atLatest = month.year === new Date(now).getFullYear() && month.month === new Date(now).getMonth();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.side} />
        <Text style={styles.barTitle} accessibilityRole="header">Mood</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.side}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{when === 'morning' ? 'How do you feel this morning?' : 'How was your day?'}</Text>
          <MoodPicker label="Your mood now" value={todays?.mood} onPick={(mood) => update((d, t) => addMood(d, mood, moodWhen(t), t))} />
          <Txt variant="caption">{todays ? `Saved for this ${when === 'morning' ? 'morning' : 'evening'}. Tap another to change it.` : 'Ryz also asks after your morning missions and when you start sleep.'}</Txt>
        </View>

        <View style={styles.card}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.arrow}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.month}>{MONTH.format(from)}</Text>
            <Pressable onPress={() => !atLatest && shift(1)} disabled={atLatest} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next month" style={[styles.arrow, atLatest && styles.faded]}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </Pressable>
          </View>
          {sample ? <Text style={styles.sample}>Sample moods until you log your own</Text> : null}
          <View style={styles.week}>
            {LETTERS.map((l, i) => (
              <Text key={i} style={styles.letter}>{l}</Text>
            ))}
          </View>
          {weeks.map((w, wi) => (
            <View key={wi} style={styles.week}>
              {w.map((d, di) => {
                if (d === null) return <View key={di} style={styles.cell} />;
                const m = moodsOn(moods, d);
                const future = d > now;
                return (
                  <Pressable
                    key={di}
                    disabled={future}
                    onPress={() => setPicked(d)}
                    accessibilityRole="button"
                    accessibilityLabel={`${DAY_TITLE.format(d)}${m.morning ? `, morning ${MOOD[m.morning.mood].label}` : ''}${m.night ? `, evening ${MOOD[m.night.mood].label}` : ''}`}
                    style={[styles.cell, d === today && styles.today, d === picked && styles.picked]}
                  >
                    <Text style={[styles.dayNum, future && styles.faded]}>{new Date(d).getDate()}</Text>
                    <View style={styles.big}>{m.morning ? <MoodIcon mood={m.morning.mood} size={22} /> : null}</View>
                    <View style={styles.small}>{m.night ? <MoodIcon mood={m.night.mood} size={13} color={colors.textMuted} /> : null}</View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Txt variant="caption" style={styles.center}>Big face: morning · small: evening</Txt>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{DAY_TITLE.format(picked)}</Text>
          {(['morning', 'night'] as const).map((k) => (
            <View key={k} style={styles.line}>
              <Txt variant="caption" style={styles.lineLabel}>{k === 'morning' ? 'Morning' : 'Evening'}</Txt>
              {day[k] ? (
                <View style={styles.lineMood}>
                  <MoodIcon mood={day[k]!.mood} size={18} />
                  <Text style={styles.lineValue}>{MOOD[day[k]!.mood].label}</Text>
                </View>
              ) : (
                <Text style={styles.lineValue}>—</Text>
              )}
            </View>
          ))}
          <View style={styles.line}>
            <Txt variant="caption" style={styles.lineLabel}>Sleep before</Txt>
            <Text style={styles.lineValue}>{dayNight ? formatDuration(minutesAsleep(dayNight)) : '—'}</Text>
          </View>
        </View>

        {counts.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>This month</Text>
            <View style={styles.counts}>
              {counts.map((c) => (
                <View key={c.id} style={styles.count}>
                  <MoodIcon mood={c.id} size={16} />
                  <Text style={styles.countText}>{`${MOOD[c.id].label} ${c.count}`}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.card, styles.insight]}>
          <Ionicons name="moon-outline" size={20} color={colors.text} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Mood and sleep</Text>
            <Txt variant="caption">
              {link
                ? link.rested - link.short >= 0.4
                  ? `Your mornings are brighter after a full night: ${link.rested.toFixed(1)} vs ${link.short.toFixed(1)} out of 5 after short ones.`
                  : 'So far your morning mood is about the same after short and full nights.'
                : 'After a few mornings, Ryz shows how your sleep changes your mood.'}
            </Txt>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: space.md },
  side: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: FONT.medium, color: colors.text },
  content: { paddingHorizontal: space.lg, gap: space.md },
  card: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.sm },
  cardTitle: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  month: { fontSize: 16, fontFamily: FONT.medium, color: colors.text },
  faded: { opacity: 0.3 },
  sample: { fontSize: 11, fontFamily: FONT.regular, color: colors.textMuted, textAlign: 'center' },
  week: { flexDirection: 'row', gap: 4 },
  letter: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: FONT.medium, color: colors.textFaint },
  cell: { flex: 1, height: 64, borderRadius: radius.sm, alignItems: 'center', paddingTop: 3 },
  today: { borderWidth: 1, borderColor: colors.borderStrong },
  picked: { backgroundColor: colors.surfaceRaised },
  dayNum: { fontSize: 10, fontFamily: FONT.regular, color: colors.textMuted },
  big: { height: 27, justifyContent: 'center' },
  small: { height: 15, justifyContent: 'center' },
  lineMood: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineLabel: { flex: 1 },
  lineValue: { fontSize: 15, fontFamily: FONT.regular, color: colors.text },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  countText: { fontSize: 12, fontFamily: FONT.regular, color: colors.text },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  flex: { flex: 1, gap: 2 },
});
