import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { MISSIONS } from '@/core/missions';
import { SOUNDS, type SoundCategory } from '@/core/sounds';
import type { Alarm } from '@/core/types';
import { MISSION_ICONS } from '@/missions/common';
import { colors, radius, space } from '@/theme';
import { Txt, type IconName } from './ui';

export const CATEGORY_ICON: Record<SoundCategory, IconName> = { science: 'flask-outline', loud: 'megaphone-outline', calm: 'leaf-outline' };

/** The short name on an alarm's badge: the 520 Hz tone is better known as "Deep sleeper". */
export function soundShortName(alarm: Alarm): string {
  return alarm.sound === 'deep' ? 'Deep sleeper' : (SOUNDS[alarm.sound] ?? SOUNDS.gentle).title;
}

/** The sound and mission icons under an alarm. */
export function AlarmTags({ alarm }: { alarm: Alarm }) {
  const missions = alarm.missions.map((m) => MISSIONS[m.type].title).join(', ');
  const sound = SOUNDS[alarm.sound] ?? SOUNDS.gentle;
  const name = soundShortName(alarm);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${name}${missions ? `. Missions: ${missions}` : ''}`}>
      <View style={styles.badge}>
        <Ionicons name={CATEGORY_ICON[sound.category]} size={13} color={colors.text} />
        <Txt style={styles.text}>{name}</Txt>
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
