import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BODY, BRAIN, LEVEL_NAMES, MAX_MISSIONS, MISSIONS, defaultMission, type Mission, type MissionLevel, type MissionType } from '@/core/missions';
import { MISSION_ICONS } from '@/missions/common';
import { colors, radius, space } from '@/theme';
import { Chips, Divider, Txt, haptic } from './ui';

interface Props {
  missions: Mission[];
  onChange: (missions: Mission[]) => void;
}

function Row({ type, mission, disabled, onToggle, onUpdate }: { type: MissionType; mission?: Mission; disabled: boolean; onToggle: () => void; onUpdate: (m: Mission) => void }) {
  const info = MISSIONS[type];
  const on = Boolean(mission);
  return (
    <View>
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on, disabled }}
        accessibilityLabel={`${info.title}. ${info.description}`}
        style={[styles.row, disabled && styles.disabled]}
      >
        <View style={[styles.icon, on && styles.iconOn]}>
          <Ionicons name={MISSION_ICONS[type]} size={20} color={on ? colors.onAccent : colors.text} />
        </View>
        <View style={styles.text}>
          <Txt variant="body">{info.title}</Txt>
          <Txt variant="caption">{info.description}</Txt>
        </View>
        <Ionicons name={on ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={on ? colors.text : colors.textFaint} />
      </Pressable>
      {mission ? (
        <View style={styles.options}>
          <Chips title="How many" value={mission.amount} onChange={(amount) => onUpdate({ ...mission, amount })} options={info.amounts.map((n) => ({ value: n, label: info.unit(n) }))} />
          {info.hasLevels ? (
            <Chips
              title="Difficulty"
              value={mission.level}
              onChange={(level) => onUpdate({ ...mission, level: level as MissionLevel })}
              options={([1, 2, 3] as const).map((l) => ({ value: l, label: LEVEL_NAMES[l] }))}
            />
          ) : null}
          <Pressable
            onPress={() => router.push({ pathname: '/try-mission', params: { type, amount: String(mission.amount), level: String(mission.level) } })}
            accessibilityRole="button"
            style={styles.try}
          >
            <Ionicons name="play" size={14} color={colors.text} />
            <Txt style={styles.tryText}>Try it</Txt>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Wake your brain / wake your body: pick up to three missions to do before the alarm stops. */
export function MissionPicker({ missions, onChange }: Props) {
  const full = missions.length >= MAX_MISSIONS;
  const toggle = (type: MissionType) => {
    haptic('select');
    if (missions.some((m) => m.type === type)) onChange(missions.filter((m) => m.type !== type));
    else if (!full) onChange([...missions, defaultMission(type)]);
  };
  const update = (next: Mission) => onChange(missions.map((m) => (m.type === next.type ? next : m)));

  const group = (title: string, types: MissionType[]) => (
    <View style={styles.group}>
      <Txt variant="label" style={styles.groupLabel}>{title}</Txt>
      <View style={styles.card}>
        {types.map((type, i) => {
          const mission = missions.find((m) => m.type === type);
          return (
            <View key={type}>
              {i > 0 ? <Divider /> : null}
              <Row type={type} mission={mission} disabled={!mission && full} onToggle={() => toggle(type)} onUpdate={update} />
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      {group('Wake your brain', BRAIN)}
      {group('Wake your body', BODY)}
      <Txt variant="caption" style={styles.footer}>
        {missions.length === 0
          ? 'With no mission, Stop turns the alarm off. Add one so you have to wake up first.'
          : `Stop starts your ${missions.length === 1 ? 'mission' : `${missions.length} missions`}; the alarm turns off when you finish. Up to ${MAX_MISSIONS}.`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  group: { gap: space.sm },
  groupLabel: { marginLeft: space.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 64 },
  disabled: { opacity: 0.35 },
  icon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: { flex: 1, gap: 2 },
  options: { paddingLeft: 52, paddingBottom: space.md },
  try: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginTop: space.xs,
  },
  tryText: { fontSize: 14, fontWeight: '600', color: colors.text },
  footer: { marginHorizontal: space.xs },
});
