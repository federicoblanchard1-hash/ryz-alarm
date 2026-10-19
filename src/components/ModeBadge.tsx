import { StyleSheet, View } from 'react-native';

import type { WakeMode } from '@/core/types';
import { colors, radius, space } from '@/theme';
import { Txt } from './ui';

export const MODE_NAME: Record<WakeMode, string> = { gentle: 'Gentle', deep: 'Deep sleeper' };

export function ModeBadge({ mode }: { mode: WakeMode }) {
  const color = mode === 'deep' ? colors.deep : colors.gentle;
  return (
    <View style={[styles.badge, { backgroundColor: mode === 'deep' ? colors.deepSoft : colors.gentleSoft }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Txt style={[styles.text, { color }]}>{MODE_NAME[mode]}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '600' },
});
