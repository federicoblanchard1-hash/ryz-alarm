import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { formatClock } from '@/core/time';
import { colors, radius, space } from '@/theme';
import { PressableScale, Txt } from './ui';

interface Props {
  hour: number;
  minute: number;
  use24h: boolean;
  onChange: (hour: number, minute: number) => void;
}

// The web build is a preview, so it gets simple steppers instead of a native picker.
export function TimePicker({ hour, minute, use24h, onChange }: Props) {
  const { time, period } = formatClock(hour, minute, use24h);
  const shift = (minutes: number) => {
    const total = (hour * 60 + minute + minutes + 24 * 60) % (24 * 60);
    onChange(Math.floor(total / 60), total % 60);
  };
  const stepper = (label: string, minutes: number) => (
    <View style={styles.stepper}>
      <Txt variant="caption">{label}</Txt>
      <View style={styles.pair}>
        <PressableScale style={styles.step} onPress={() => shift(-minutes)} accessibilityLabel={`${label} minus`}>
          <Ionicons name="remove" size={20} color={colors.text} />
        </PressableScale>
        <PressableScale style={styles.step} onPress={() => shift(minutes)} accessibilityLabel={`${label} plus`}>
          <Ionicons name="add" size={20} color={colors.text} />
        </PressableScale>
      </View>
    </View>
  );
  return (
    <View style={styles.box}>
      <View style={styles.clockRow}>
        <Txt style={styles.clock}>{time}</Txt>
        {period ? <Txt style={styles.period}>{period}</Txt> : null}
      </View>
      <View style={styles.steppers}>
        {stepper('Hour', 60)}
        {stepper('5 min', 5)}
        {stepper('1 min', 1)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: space.lg, gap: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  clock: { fontSize: 64, lineHeight: 76, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'] },
  period: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: colors.textMuted },
  steppers: { flexDirection: 'row', gap: space.lg },
  stepper: { alignItems: 'center', gap: space.xs },
  pair: { flexDirection: 'row', gap: space.xs },
  step: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
});
