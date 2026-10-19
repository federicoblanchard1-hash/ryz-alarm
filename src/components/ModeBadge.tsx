import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { MISSIONS } from '@/core/missions';
import type { Alarm, WakeMode } from '@/core/types';
import { MISSION_ICONS } from '@/missions/common';
import { colors, radius, space } from '@/theme';
import { Txt, type IconName } from './ui';

export const MODE_NAME: Record<WakeMode, string> = { gentle: 'Gentle', deep: 'Deep sleeper' };
export const MODE_ICON: Record<WakeMode, IconName> = { gentle: 'sunny-outline', deep: 'pulse-outline' };

/** The wake-up style and mission icons under an alarm. */
export function AlarmTags({ alarm }: { alarm: Alarm }) {
  const missions = alarm.missions.map((m) => MISSIONS[m.type].title).join(', ');
  return (
    <View style={styles.row} accessible accessibilityLabel={`${MODE_NAME[alarm.mode]}${missions ? `. Missions: ${missions}` : ''}`}>
      <View style={styles.badge}>
        <Ionicons name={MODE_ICON[alarm.mode]} size={13} color={colors.text} />
        <Txt style={styles.text}>{MODE_NAME[alarm.mode]}</Txt>
      </View>
      {alarm.missions.map((m, i) => (
        <View key={`${m.type}${i}`} style={styles.icon}>
          <Ionicons name={MISSION_ICONS[m.type]} size={14} color={colors.text} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.sm + 2,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  text: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.text },
  icon: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
});
