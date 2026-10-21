import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '@/core/sleep';
import { formatClockText, formatHours } from '@/core/time';
import { nightsToShow, nowAndNext, planDay, planSteps, wakeRhythm, type NowNext, type PlanStep } from '@/core/today';
import { addXp, daylightDone, daylightXp } from '@/core/xp';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';
import { haptic, Txt, type IconName } from './ui';

const STEP: Record<PlanStep['id'] | 'steady' | 'early' | 'night', { icon: IconName; title: string; tip: string }> = {
  groggy: { icon: 'cloudy-outline', title: 'Waking up', tip: 'Feeling slow is normal now. Light and a little movement help.' },
  focus: { icon: 'flash-outline', title: 'Best focus', tip: 'Your sharpest hours. Do the hardest thing first.' },
  dip: { icon: 'battery-half-outline', title: 'Afternoon dip', tip: 'Energy drops. A 10–20 min nap or a short walk helps more than coffee.' },
  coffee: { icon: 'cafe-outline', title: 'Last coffee', tip: 'Caffeine after this can still keep you up tonight.' },
  second: { icon: 'trending-up-outline', title: 'Second wind', tip: 'Energy comes back. Good for exercise or seeing friends.' },
  wind: { icon: 'moon-outline', title: 'Wind down', tip: 'Dim the lights and put screens away.' },
  bed: { icon: 'bed-outline', title: 'Bedtime', tip: '' },
  steady: { icon: 'pulse-outline', title: 'Steady energy', tip: 'A good stretch for everyday tasks.' },
  early: { icon: 'moon-outline', title: 'Still night', tip: 'Your day plan starts when you wake up.' },
  night: { icon: 'bed-outline', title: 'Time to sleep', tip: 'Going to bed now keeps tomorrow on track.' },
};
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY = 24 * 60 * 60_000;

/**
 * Today, on Morning, in three parts read top to bottom: what your energy is
 * like right now and what's next; your day at a glance (a chart and the
 * times); and two small habits (daylight, a regular wake-up).
 */
export const Today = memo(function Today() {
  const { data, update, updateSettings } = useStore();
  const now = useNow(60_000);
  const { use24h, sleepGoalMinutes } = data.settings;
  const { nights, sample } = nightsToShow(data, now);
  const plan = planDay(data, now, nights);
  const steps = planSteps(plan, now);
  const nn: NowNext = nowAndNext(plan, now);
  const rhythm = wakeRhythm(nights, now);
  const time = (ms: number) => {
    const d = new Date(ms);
    return formatClockText(d.getHours(), d.getMinutes(), use24h);
  };
  const daylight = daylightDone(data, now);
  const nowIndex = plan.curve.findIndex((p) => p.at > now) - 1;
  const current = STEP[nn.now];
  const noon = new Date(now).setHours(12, 0, 0, 0);
  const evening = new Date(now).setHours(18, 0, 0, 0);
  const span = plan.bed - plan.wake;
  const tick = (ms: number) => `${Math.round(((ms - plan.wake) / span) * 100)}%` as const;

  const basis =
    plan.lastNightMinutes !== null
      ? `Based on last night’s ${formatDuration(plan.lastNightMinutes)} of sleep${plan.debtMinutes >= 30 ? ` and ${formatDuration(plan.debtMinutes)} of sleep debt` : ''}.`
      : plan.wakeFrom === 'usual'
        ? `Based on your usual ${time(plan.wake)} wake-up.`
        : plan.wakeFrom === 'alarm'
          ? `Based on your ${time(plan.wake)} alarm.`
          : 'Track a night of sleep to make this yours.';

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Txt style={styles.title} accessibilityRole="header">Today</Txt>
        {sample ? (
          <Pressable onPress={() => updateSettings({ sampleSleep: false })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Sample data. Hide it" style={styles.sample}>
            <Text style={styles.sampleText}>Sample</Text>
            <Ionicons name="close" size={12} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <Txt variant="caption" style={styles.basis}>{`Your energy, estimated. ${basis}`}</Txt>

      {/* 1. Right now */}
      <View style={[styles.card, styles.nowCard]} accessible accessibilityLabel={`Right now: ${current.title}${nn.until ? ` until ${time(nn.until)}` : ''}. ${current.tip}`}>
        <Text style={styles.kicker}>RIGHT NOW</Text>
        <View style={styles.nowRow}>
          <Ionicons name={current.icon} size={26} color={colors.text} />
          <View style={styles.flex}>
            <Text style={styles.nowTitle}>{current.title}</Text>
            {nn.until && nn.now !== 'early' ? <Text style={styles.nowUntil}>{`until ${time(nn.until)}`}</Text> : null}
          </View>
        </View>
        <Text style={styles.nowTip}>{current.tip}</Text>
        {nn.next ? (
          <View style={styles.nextRow}>
            <Text style={styles.nextLabel}>Next</Text>
            <Ionicons name={STEP[nn.next.id].icon} size={14} color={colors.textMuted} />
            <Text style={styles.nextText}>{`${STEP[nn.next.id].title} at ${time(nn.next.from)}`}</Text>
          </View>
        ) : null}
      </View>

      {/* 2. Your day */}
      <View style={styles.card}>
        <View style={styles.chartHead}>
          <Text style={styles.cardTitle}>Your day</Text>
          <Text style={styles.legend}>Taller = more energy</Text>
        </View>
        <View style={styles.chart} accessible accessibilityLabel={`Energy from ${time(plan.wake)} to ${time(plan.bed)}: highest in the late morning, lower after lunch, then a second wind`}>
          {plan.curve.map((p, i) => (
            <View key={p.at} style={[styles.bar, { height: `${Math.round(p.level * 100)}%` }, i < nowIndex && styles.barPast, i === nowIndex && styles.barNow]} />
          ))}
        </View>
        <View style={styles.axis}>
          <Text style={[styles.axisText, styles.axisStart]}>{time(plan.wake)}</Text>
          {noon > plan.wake + 2 * 3600_000 && noon < plan.bed - 2 * 3600_000 ? <Text style={[styles.axisText, styles.axisMid, { left: tick(noon) }]}>Noon</Text> : null}
          {evening > plan.wake + 2 * 3600_000 && evening < plan.bed - 2 * 3600_000 ? <Text style={[styles.axisText, styles.axisMid, { left: tick(evening) }]}>{time(evening)}</Text> : null}
          <Text style={[styles.axisText, styles.axisEnd]}>{time(plan.bed)}</Text>
        </View>

        {steps.map((s) => {
          const info = STEP[s.id];
          return (
            <View key={s.id} style={[styles.step, s.state === 'past' && styles.stepPast]}>
              <Text style={[styles.stepTime, s.state === 'now' && styles.bold]}>{time(s.from)}</Text>
              <Ionicons name={info.icon} size={15} color={s.state === 'now' ? colors.text : colors.textMuted} />
              <Text style={[styles.stepTitle, s.state === 'now' && styles.bold]} numberOfLines={1}>
                {s.id === 'bed' ? `Bedtime · ${formatHours(sleepGoalMinutes)} before tomorrow` : s.to && s.id !== 'wind' ? `${info.title} until ${time(s.to)}` : info.title}
              </Text>
              {s.state === 'now' ? <Text style={styles.nowTag}>Now</Text> : null}
            </View>
          );
        })}
      </View>

      {/* 3. Two habits */}
      <Pressable
        onPress={() => {
          if (daylight) return;
          haptic('success');
          update((d, t) => addXp(d, [daylightXp(t)]));
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: daylight }}
        accessibilityLabel="Got morning daylight"
        style={({ pressed }) => [styles.card, styles.task, pressed && !daylight && styles.pressed]}
      >
        <Ionicons name="sunny-outline" size={20} color={colors.text} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Get daylight</Text>
          <Txt variant="caption">
            {daylight ? 'Done today · +10 XP' : now > plan.daylightBy ? 'Tap when you’ve been outside 10 min. It still helps tonight’s sleep.' : `Tap when you’ve been outside 10 min, ideally before ${time(plan.daylightBy)}.`}
          </Txt>
        </View>
        <View style={[styles.check, daylight && styles.checkOn]}>{daylight ? <Ionicons name="checkmark" size={16} color={colors.onAccent} /> : null}</View>
      </Pressable>

      <Pressable onPress={() => router.push('/sleep')} accessibilityRole="button" accessibilityLabel={`Wake-up streak: ${rhythm.streak} days in a row on time`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.task}>
          <Ionicons name="repeat-outline" size={20} color={colors.text} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{rhythm.usual === null ? 'Wake-up streak' : `${rhythm.streak}-day wake-up streak`}</Text>
            <Txt variant="caption">
              {rhythm.usual === null
                ? 'Track 3 nights to start it'
                : `Days up within 30 min of your usual ${time(new Date(now).setHours(0, 0, 0, 0) + rhythm.usual * 60_000)}`}
            </Txt>
          </View>
        </View>
        <View style={styles.week}>
          {rhythm.week.map((w, i) => (
            <View key={i} style={styles.dayCol}>
              <View style={[styles.dot, w === 'on' && styles.dotOn, w === 'off' && styles.dotOff]} />
              <Text style={styles.dayLetter}>{LETTERS[new Date(now - (6 - i) * DAY).getDay()]}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.legend}>● on time   ○ off   · no night tracked</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginTop: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, lineHeight: 34, fontFamily: FONT.display, color: colors.text },
  basis: { marginTop: -space.xs, marginBottom: space.xs },
  sample: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, height: 24, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  sampleText: { fontSize: 12, fontFamily: FONT.medium, color: colors.textMuted },
  card: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.sm },
  pressed: { opacity: 0.7 },
  cardTitle: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  nowCard: { gap: space.xs, paddingVertical: space.md + 2 },
  kicker: { fontSize: 11, letterSpacing: 1, fontFamily: FONT.medium, color: colors.textFaint },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  nowTitle: { fontSize: 22, lineHeight: 27, fontFamily: FONT.medium, color: colors.text },
  nowUntil: { fontSize: 14, fontFamily: FONT.regular, color: colors.textMuted },
  nowTip: { fontSize: 14, lineHeight: 20, fontFamily: FONT.light, color: colors.text },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xs, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  nextLabel: { fontSize: 11, letterSpacing: 1, fontFamily: FONT.medium, color: colors.textFaint, textTransform: 'uppercase' },
  nextText: { fontSize: 13, fontFamily: FONT.regular, color: colors.textMuted },
  chartHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  legend: { fontSize: 11, fontFamily: FONT.regular, color: colors.textFaint },
  chart: { height: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, borderRadius: 2, backgroundColor: colors.textFaint },
  barPast: { backgroundColor: colors.surfaceRaised },
  barNow: { backgroundColor: colors.text },
  axis: { height: 14, marginTop: -2, marginBottom: space.xs },
  axisText: { position: 'absolute', fontSize: 11, fontFamily: FONT.regular, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  axisStart: { left: 0 },
  axisMid: { transform: [{ translateX: -14 }] },
  axisEnd: { right: 0 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  stepPast: { opacity: 0.4 },
  stepTime: { width: 70, fontSize: 13, fontFamily: FONT.regular, color: colors.text, fontVariant: ['tabular-nums'] },
  stepTitle: { flex: 1, fontSize: 14, fontFamily: FONT.regular, color: colors.text },
  bold: { fontFamily: FONT.semibold },
  nowTag: { fontSize: 10, fontFamily: FONT.semibold, color: colors.onAccent, backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill, overflow: 'hidden' },
  flex: { flex: 1, gap: 1 },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs, marginTop: space.xs },
  dayCol: { alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.borderStrong },
  dotOn: { backgroundColor: colors.text, borderColor: colors.text },
  dotOff: { backgroundColor: 'transparent', borderColor: colors.text },
  dayLetter: { fontSize: 10, fontFamily: FONT.regular, color: colors.textFaint },
});
