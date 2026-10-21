import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '@/core/sleep';
import { formatClockText, formatHours } from '@/core/time';
import { nightsToShow, planDay, planSteps, wakeRhythm, type PlanStep } from '@/core/today';
import { addXp, daylightDone, daylightXp } from '@/core/xp';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';
import { haptic, Txt, type IconName } from './ui';

const STEP: Record<PlanStep['id'], { icon: IconName; title: string; tip: string }> = {
  groggy: { icon: 'cloudy-outline', title: 'Groggy', tip: 'Light and a little movement clear it faster' },
  focus: { icon: 'flash-outline', title: 'Best focus', tip: 'Do the hardest thing here' },
  dip: { icon: 'battery-half-outline', title: 'Afternoon dip', tip: 'A 10–20 min nap or a walk, not more coffee' },
  coffee: { icon: 'cafe-outline', title: 'Last coffee', tip: 'Caffeine later than this still costs sleep tonight' },
  second: { icon: 'trending-up-outline', title: 'Second wind', tip: 'Good for exercise or plans with friends' },
  wind: { icon: 'moon-outline', title: 'Wind down', tip: 'Dim the lights, put screens away' },
  bed: { icon: 'bed-outline', title: 'Bed', tip: '' },
};
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY = 24 * 60 * 60_000;

/**
 * Today, on Morning: your energy through the day from your own sleep, when to
 * focus, rest, stop coffee and wind down; a daylight task; and how regular
 * your mornings are.
 */
export const Today = memo(function Today() {
  const { data, update, updateSettings } = useStore();
  const now = useNow(60_000);
  const { use24h, sleepGoalMinutes } = data.settings;
  const { nights, sample } = nightsToShow(data, now);
  const plan = planDay(data, now, nights);
  const steps = planSteps(plan, now);
  const rhythm = wakeRhythm(nights, now);
  const time = (ms: number) => {
    const d = new Date(ms);
    return formatClockText(d.getHours(), d.getMinutes(), use24h);
  };
  const daylight = daylightDone(data, now);
  const afterDaylight = now > plan.daylightBy;
  const nowIndex = plan.curve.findIndex((p) => p.at > now) - 1;

  const basis =
    plan.lastNightMinutes !== null
      ? `From last night’s ${formatDuration(plan.lastNightMinutes)}${plan.debtMinutes >= 30 ? ` and ${formatDuration(plan.debtMinutes)} of sleep debt` : ''}`
      : plan.wakeFrom === 'usual'
        ? `For your usual ${time(plan.wake)} wake-up`
        : plan.wakeFrom === 'alarm'
          ? `For your ${time(plan.wake)} alarm`
          : 'Track a night to make this yours';

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
      <Txt variant="caption" style={styles.basis}>{`${basis} · an estimate`}</Txt>

      <View style={styles.card}>
        <View style={styles.chart} accessible accessibilityLabel={`Your energy today, from ${time(plan.wake)} to ${time(plan.bed)}`}>
          {plan.curve.map((p, i) => (
            <View key={p.at} style={[styles.bar, { height: `${Math.round(p.level * 100)}%` }, i < nowIndex && styles.barPast, i === nowIndex && styles.barNow]} />
          ))}
        </View>
        <View style={styles.axis}>
          <Text style={styles.axisText}>{time(plan.wake)}</Text>
          <Text style={styles.axisText}>{time(plan.bed)}</Text>
        </View>

        {steps.map((s) => {
          const info = STEP[s.id];
          const when = s.to && s.id !== 'wind' ? `${time(s.from)}–${time(s.to)}` : time(s.from);
          const tip = s.id === 'bed' ? `${formatHours(sleepGoalMinutes)} before tomorrow` : info.tip;
          return (
            <View key={s.id} style={[styles.step, s.state === 'past' && styles.stepPast]}>
              <Ionicons name={info.icon} size={17} color={s.state === 'now' ? colors.text : colors.textMuted} />
              <View style={styles.flex}>
                <View style={styles.stepTop}>
                  <Text style={[styles.stepTitle, s.state === 'now' && styles.stepTitleNow]}>{info.title}</Text>
                  {s.state === 'now' ? <Text style={styles.nowTag}>Now</Text> : null}
                </View>
                {s.state !== 'past' ? <Text style={styles.stepTip}>{tip}</Text> : null}
              </View>
              <Text style={[styles.stepTime, s.state === 'now' && styles.stepTitleNow]}>{when}</Text>
            </View>
          );
        })}
      </View>

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
          <Text style={styles.taskTitle}>Get daylight</Text>
          <Txt variant="caption">
            {daylight ? 'Done today · +10 XP' : afterDaylight ? 'Still worth it today: daylight helps you sleep tonight' : `10 min outside before ${time(plan.daylightBy)}, even if it’s cloudy`}
          </Txt>
        </View>
        <View style={[styles.check, daylight && styles.checkOn]}>{daylight ? <Ionicons name="checkmark" size={16} color={colors.onAccent} /> : null}</View>
      </Pressable>

      <Pressable onPress={() => router.push('/sleep')} accessibilityRole="button" accessibilityLabel={`Wake-up rhythm: ${rhythm.streak} days in a row on time`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.task}>
          <Ionicons name="repeat-outline" size={20} color={colors.text} />
          <View style={styles.flex}>
            <Text style={styles.taskTitle}>{rhythm.usual === null ? 'Wake-up rhythm' : `${rhythm.streak}-day wake-up streak`}</Text>
            <Txt variant="caption">
              {rhythm.usual === null
                ? 'Track 3 nights to see how regular your mornings are'
                : `Usually up at ${time(new Date(new Date(now).setHours(0, 0, 0, 0)).getTime() + rhythm.usual * 60_000)}${rhythm.spread !== null ? ` · ±${Math.round(rhythm.spread)} min this week` : ''}`}
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
  chart: { height: 56, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, borderRadius: 2, backgroundColor: colors.textFaint },
  barPast: { backgroundColor: colors.surfaceRaised },
  barNow: { backgroundColor: colors.text },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2, marginBottom: space.xs },
  axisText: { fontSize: 11, fontFamily: FONT.regular, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  stepPast: { opacity: 0.45 },
  flex: { flex: 1, gap: 1 },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepTitle: { fontSize: 15, fontFamily: FONT.regular, color: colors.text },
  stepTitleNow: { fontFamily: FONT.semibold },
  nowTag: { fontSize: 10, fontFamily: FONT.semibold, color: colors.onAccent, backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill, overflow: 'hidden' },
  stepTip: { fontSize: 12, lineHeight: 16, fontFamily: FONT.light, color: colors.textMuted },
  stepTime: { fontSize: 13, fontFamily: FONT.regular, color: colors.text, fontVariant: ['tabular-nums'] },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  taskTitle: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs, marginTop: space.xs },
  dayCol: { alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.borderStrong },
  dotOn: { backgroundColor: colors.text, borderColor: colors.text },
  dotOff: { backgroundColor: colors.surfaceRaised, borderColor: colors.danger },
  dayLetter: { fontSize: 10, fontFamily: FONT.regular, color: colors.textFaint },
});
