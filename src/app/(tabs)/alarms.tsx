import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarSpace } from '@/components/tabBarSpace';
import { AlarmRow } from '@/components/AlarmRow';
import { PressableScale, Segmented, Txt } from '@/components/ui';
import { nextRing } from '@/core/next';
import { formatClock, formatSpan } from '@/core/time';
import { useNow } from '@/state/useNow';
import { sortedAlarms, useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

const openEditor = (id: string) => router.push({ pathname: '/alarm/[id]', params: { id } });

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export default function Alarms() {
  const { data, ready, setEnabled, updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const now = useNow();
  const { use24h } = data.settings;
  const alarms = sortedAlarms(data.alarms);
  const date = new Date(now);
  const clock = formatClock(date.getHours(), date.getMinutes(), use24h);
  const next = nextRing(data, now);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: tabSpace + 110 }]}>
        <View style={styles.header}>
          <Txt style={styles.wordmark} accessibilityRole="header" accessibilityLabel="Ryz alarms">ryz</Txt>
          <Segmented
            label="Clock format"
            value={use24h ? '24' : '12'}
            onChange={(v) => updateSettings({ use24h: v === '24' })}
            options={[
              { value: '12', label: '12h' },
              { value: '24', label: '24h' },
            ]}
          />
        </View>

        <View style={styles.now} accessible accessibilityLabel={`It's ${clock.time} ${clock.period}, ${DATE_FORMAT.format(date)}`}>
          <View style={styles.clockRow}>
            <Txt style={styles.clock}>{clock.time}</Txt>
            {clock.period ? <Txt style={styles.period}>{clock.period}</Txt> : null}
          </View>
          <Txt variant="muted">{DATE_FORMAT.format(date)}</Txt>
          <View style={styles.status}>
            <View style={[styles.dot, next ? styles.dotOn : null]} />
            <Txt style={styles.statusText}>{next ? `${next.snoozed ? 'Snoozed, rings' : 'Next alarm'} in ${formatSpan(next.at - now)}` : 'No alarms set'}</Txt>
          </View>
        </View>

        {ready && alarms.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="alarm-outline" size={40} color={colors.textFaint} />
            <Txt variant="heading">No alarms yet</Txt>
            <Txt variant="muted" style={styles.center}>
              {"Tap + to add one. Gentle fades in a melody; Deep sleeper uses the low tone that wakes heavy sleepers."}
            </Txt>
          </View>
        ) : (
          alarms.map((alarm) => (
            <AlarmRow key={alarm.id} alarm={alarm} use24h={use24h} onPress={() => openEditor(alarm.id)} onToggle={(enabled) => setEnabled(alarm.id, enabled)} />
          ))
        )}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: tabSpace + space.lg }]} pointerEvents="box-none">
        <PressableScale onPress={() => openEditor('new')} style={styles.fab} accessibilityLabel="Add alarm">
          <Ionicons name="add" size={32} color={colors.onAccent} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.md },
  wordmark: { fontSize: 34, lineHeight: 40, fontFamily: FONT.displayItalic, color: colors.text, letterSpacing: 1 },
  list: { paddingHorizontal: space.lg, gap: space.md },
  now: { alignItems: 'center', paddingTop: space.xxl, paddingBottom: space.xl, gap: space.xs },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  clock: { fontSize: 84, lineHeight: 92, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -3 },
  period: { fontSize: 22, lineHeight: 28, fontFamily: FONT.regular, color: colors.textMuted },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textFaint },
  dotOn: { backgroundColor: colors.text },
  statusText: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regular, color: colors.text },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  center: { textAlign: 'center' },
  fabWrap: { position: 'absolute', right: space.xl },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
});
