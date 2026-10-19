import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';

import { formatClock } from '@/core/time';
import { colors, radius, space } from '@/theme';
import { PressableScale, Txt } from './ui';

interface Props {
  hour: number;
  minute: number;
  use24h: boolean;
  onChange: (hour: number, minute: number) => void;
}

export function TimePicker({ hour, minute, use24h, onChange }: Props) {
  const value = new Date(2000, 0, 1, hour, minute);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        mode="time"
        display="spinner"
        value={value}
        is24Hour={use24h}
        themeVariant="dark"
        textColor={colors.text}
        accentColor={colors.text}
        onChange={(_, date) => date && onChange(date.getHours(), date.getMinutes())}
        style={styles.ios}
      />
    );
  }

  // Android shows the picker as a dialog, so the screen shows the time big
  // and opens the dialog on tap.
  const { time, period } = formatClock(hour, minute, use24h);
  return (
    <PressableScale
      style={styles.android}
      accessibilityLabel={`Alarm time ${time} ${period}. Tap to change`}
      onPress={() =>
        DateTimePickerAndroid.open({
          mode: 'time',
          value,
          is24Hour: use24h,
          onChange: (event, date) => {
            if (event.type === 'set' && date) onChange(date.getHours(), date.getMinutes());
          },
        })
      }
    >
      <View style={styles.clockRow}>
        <Txt style={styles.clock}>{time}</Txt>
        {period ? <Txt style={styles.period}>{period}</Txt> : null}
      </View>
      <Txt variant="caption">Tap to change</Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  ios: { height: 200 },
  android: {
    alignItems: 'center',
    paddingVertical: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  clock: { fontSize: 64, lineHeight: 76, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'] },
  period: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: colors.textMuted },
});
