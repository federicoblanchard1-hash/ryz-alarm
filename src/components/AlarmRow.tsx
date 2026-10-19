import { StyleSheet, View } from 'react-native';

import { formatClock, formatDays } from '@/core/time';
import type { Alarm } from '@/core/types';
import { colors, radius, space } from '@/theme';
import { AlarmTags } from './ModeBadge';
import { PressableScale, ThemedSwitch, Txt } from './ui';

interface Props {
  alarm: Alarm;
  use24h: boolean;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
}

export function AlarmRow({ alarm, use24h, onPress, onToggle }: Props) {
  const { time, period } = formatClock(alarm.hour, alarm.minute, use24h);
  const detail = [alarm.label.trim(), formatDays(alarm.days)].filter(Boolean).join(' · ');
  return (
    <PressableScale onPress={onPress} style={styles.row} accessibilityLabel={`Alarm ${time} ${period}, ${detail}. Edit`}>
      <View style={[styles.text, !alarm.enabled && styles.off]}>
        <View style={styles.clockRow}>
          <Txt style={styles.clock}>{time}</Txt>
          {period ? <Txt style={styles.period}>{period}</Txt> : null}
        </View>
        <Txt variant="caption" numberOfLines={1}>{detail}</Txt>
        <AlarmTags alarm={alarm} />
      </View>
      <ThemedSwitch value={alarm.enabled} onChange={onToggle} label={alarm.enabled ? 'Turn alarm off' : 'Turn alarm on'} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  text: { flex: 1, gap: space.xs },
  off: { opacity: 0.4 },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  clock: { fontSize: 48, lineHeight: 56, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  period: { fontSize: 16, lineHeight: 22, fontWeight: '500', color: colors.textMuted },
});
