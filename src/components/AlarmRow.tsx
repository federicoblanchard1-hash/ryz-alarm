import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { formatClock, formatDays } from '@/core/time';
import type { Alarm } from '@/core/types';
import { FONT, colors, radius, space } from '@/theme';
import { AlarmTags } from './ModeBadge';
import { PressableScale, ThemedSwitch, Txt, haptic } from './ui';

const ACTION_WIDTH = 96;

interface Props {
  alarm: Alarm;
  use24h: boolean;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}

/** The red Delete revealed by swiping the row to the left. It grows in as the row slides. */
function DeleteAction({ drag, onDelete }: { drag: SharedValue<number>; onDelete: () => void }) {
  const style = useAnimatedStyle(() => {
    const shown = interpolate(-drag.value, [0, ACTION_WIDTH], [0, 1], 'clamp');
    return { opacity: shown, transform: [{ scale: 0.85 + 0.15 * shown }] };
  });
  return (
    <Animated.View style={[styles.action, style]}>
      <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete alarm" style={styles.actionButton}>
        <Ionicons name="trash" size={24} color={colors.text} />
        <Text style={styles.actionText}>Delete</Text>
      </Pressable>
    </Animated.View>
  );
}

/** An alarm in the list. Tap to edit, switch to turn on or off, swipe left to delete. */
export function AlarmRow({ alarm, use24h, onPress, onToggle, onDelete }: Props) {
  const swipe = useRef<SwipeableMethods>(null);
  const { time, period } = formatClock(alarm.hour, alarm.minute, use24h);
  const detail = [alarm.label.trim(), formatDays(alarm.days)].filter(Boolean).join(' · ');
  const remove = () => {
    haptic('success');
    swipe.current?.close();
    onDelete();
  };
  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={1.5}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      onSwipeableWillOpen={() => haptic('select')}
      renderRightActions={(_progress, drag) => <DeleteAction drag={drag} onDelete={remove} />}
    >
      <PressableScale
        onPress={onPress}
        style={styles.row}
        accessibilityLabel={`Alarm ${time} ${period}, ${detail}. Edit`}
        accessibilityHint="Swipe left to delete"
      >
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
    </ReanimatedSwipeable>
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
  clock: { fontSize: 48, lineHeight: 56, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  period: { fontSize: 16, lineHeight: 22, fontFamily: FONT.regular, color: colors.textMuted },
  action: { width: ACTION_WIDTH, paddingLeft: space.sm },
  actionButton: { flex: 1, borderRadius: radius.lg, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionText: { fontSize: 14, fontFamily: FONT.semibold, color: colors.text },
});
