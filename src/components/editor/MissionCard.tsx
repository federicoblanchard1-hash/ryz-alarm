import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/Sheet';
import { Button, Chips, Divider, LinkRow, Txt, haptic } from '@/components/ui';
import { BODY, BRAIN, LEVEL_NAMES, MAX_MISSIONS, MISSIONS, defaultMission, type Mission, type MissionLevel, type MissionType } from '@/core/missions';
import { MISSION_ICONS } from '@/missions/common';
import { colors, radius, space } from '@/theme';

interface Props {
  missions: Mission[];
  onChange: (missions: Mission[]) => void;
  awakeCheckLabel: string;
  onAwakeCheck: () => void;
}

/** Mission slots like Alarmy's: up to three, tap an empty one to add, a full one to adjust. */
export function MissionCard({ missions, onChange, awakeCheckLabel, onAwakeCheck }: Props) {
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const edited = editing !== null ? missions[editing] : undefined;

  const add = (type: MissionType) => {
    haptic('select');
    const next = [...missions, defaultMission(type)];
    onChange(next);
    setPicking(false);
    setEditing(next.length - 1);
  };
  const update = (m: Mission) => onChange(missions.map((x, i) => (i === editing ? m : x)));
  const remove = (index: number) => {
    haptic('light');
    onChange(missions.filter((_, i) => i !== index));
    setEditing(null);
  };

  const group = (title: string, types: MissionType[]) => (
    <View style={styles.group}>
      <Txt variant="label">{title}</Txt>
      {types.map((type) => {
        const taken = missions.some((m) => m.type === type);
        return (
          <Pressable
            key={type}
            onPress={() => !taken && add(type)}
            disabled={taken}
            accessibilityRole="button"
            accessibilityState={{ disabled: taken }}
            accessibilityLabel={`${MISSIONS[type].title}. ${MISSIONS[type].description}`}
            style={({ pressed }) => [styles.pickRow, pressed && styles.pressed]}
          >
            <View style={styles.pickIcon}>
              <Ionicons name={MISSION_ICONS[type]} size={22} color={colors.text} />
            </View>
            <View style={styles.flex}>
              <Txt variant="heading">{MISSIONS[type].title}</Txt>
              <Txt variant="caption">{MISSIONS[type].description}</Txt>
            </View>
            {taken ? <Ionicons name="checkmark" size={22} color={colors.text} /> : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Txt variant="heading">Mission</Txt>
        <Txt variant="muted">{`${missions.length}/${MAX_MISSIONS}`}</Txt>
      </View>
      <View style={styles.slots}>
        {Array.from({ length: MAX_MISSIONS }, (_, i) => {
          const m = missions[i];
          if (m) {
            return (
              <View key={i} style={styles.flex}>
                <Pressable onPress={() => setEditing(i)} accessibilityRole="button" accessibilityLabel={`${MISSIONS[m.type].title}, ${MISSIONS[m.type].unit(m.amount)}. Edit`} style={[styles.slot, styles.slotOn]}>
                  <Ionicons name={MISSION_ICONS[m.type]} size={24} color={colors.onAccent} />
                  <Txt style={styles.slotLabel} numberOfLines={1}>{MISSIONS[m.type].title}</Txt>
                </Pressable>
                <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${MISSIONS[m.type].title}`} style={styles.remove}>
                  <Ionicons name="close" size={14} color={colors.text} />
                </Pressable>
              </View>
            );
          }
          const next = i === missions.length;
          return (
            <View key={i} style={styles.flex}>
              <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Add a mission" style={[styles.slot, next ? styles.slotNext : styles.slotEmpty]}>
                <Ionicons name="add" size={26} color={next ? colors.text : colors.textFaint} />
              </Pressable>
            </View>
          );
        })}
      </View>
      <Txt variant="caption" style={styles.hint}>
        {missions.length === 0 ? 'Add a mission so you have to wake up before the alarm stops.' : 'Stop starts your missions. The alarm turns off when they’re done.'}
      </Txt>
      <Divider />
      <LinkRow title="Wake up check" value={awakeCheckLabel} onPress={onAwakeCheck} />

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Mission">
        {group('Wake your brain', BRAIN)}
        {group('Wake your body', BODY)}
      </Sheet>

      <Sheet
        visible={edited !== undefined}
        onClose={() => setEditing(null)}
        title={edited ? MISSIONS[edited.type].title : ''}
        footer={<Button title="Done" onPress={() => setEditing(null)} />}
      >
        {edited ? (
          <>
            <Txt variant="muted">{MISSIONS[edited.type].description}</Txt>
            <Chips title="How many" value={edited.amount} onChange={(amount) => update({ ...edited, amount })} options={MISSIONS[edited.type].amounts.map((n) => ({ value: n, label: MISSIONS[edited.type].unit(n) }))} />
            {MISSIONS[edited.type].hasLevels ? (
              <Chips
                title="Difficulty"
                value={edited.level}
                onChange={(level) => update({ ...edited, level: level as MissionLevel })}
                options={([1, 2, 3] as const).map((l) => ({ value: l, label: LEVEL_NAMES[l] }))}
              />
            ) : null}
            <View style={styles.sheetActions}>
              <Button
                title="Try it"
                icon="play"
                variant="secondary"
                style={styles.flex}
                onPress={() => {
                  const params = { type: edited.type, amount: String(edited.amount), level: String(edited.level) };
                  setEditing(null);
                  router.push({ pathname: '/try-mission', params });
                }}
              />
              <Button title="Remove" icon="trash-outline" variant="danger" style={styles.flex} onPress={() => editing !== null && remove(editing)} />
            </View>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: space.lg, paddingTop: space.lg },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slots: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  slot: { aspectRatio: 1, borderRadius: radius.md + 4, alignItems: 'center', justifyContent: 'center', gap: 6 },
  slotOn: { backgroundColor: colors.accent },
  slotNext: { borderWidth: 1.5, borderColor: colors.borderStrong, borderStyle: 'dashed' },
  slotEmpty: { backgroundColor: colors.surfaceRaised },
  slotLabel: { fontSize: 13, lineHeight: 16, fontWeight: '600', color: colors.onAccent, paddingHorizontal: 6 },
  remove: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: space.md, marginBottom: space.sm },
  group: { gap: space.sm, marginBottom: space.md },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, minHeight: 60 },
  pressed: { opacity: 0.6 },
  pickIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  sheetActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
});
