import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProTag } from '@/components/ProTag';
import { Sheet } from '@/components/Sheet';
import { AmountPicker } from '@/components/AmountPicker';
import { Button, Chips, LinkRow, MultiChips, Txt, haptic } from '@/components/ui';
import { QrScanner } from '@/missions/QrScanner';
import { LEVEL_NAMES, MAX_MISSIONS, MISSIONS, MISSION_GROUPS, clampAmount, defaultMission, missionsIn, type Mission, type MissionLevel, type MissionType } from '@/core/missions';
import { FREE_MISSIONS, FREE_MISSION_SLOTS } from '@/core/pro';
import { HUNT_ITEMS } from '@/core/puzzles';
import { MISSION_ICONS } from '@/missions/common';
import { usePro } from '@/state/usePro';
import { FONT, colors, radius, space } from '@/theme';

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
  const [scanning, setScanning] = useState(false);
  const edited = editing !== null ? missions[editing] : undefined;
  const { pro, unlock } = usePro();
  // The paywall can't open over a sheet, so the sheet closes first.
  const upgrade = (feature: 'missions' | 'mission_slots') => {
    setPicking(false);
    unlock(feature);
  };

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

  const group = (title: string, types: MissionType[], description?: string) => (
    <View style={styles.group} key={title}>
      <Txt variant="section" style={styles.groupTitle}>{title}</Txt>
      {description ? <Txt variant="caption" style={styles.groupText}>{description}</Txt> : null}
      {types.map((type) => {
        const taken = missions.some((m) => m.type === type);
        const locked = !pro && !FREE_MISSIONS.includes(type);
        return (
          <Pressable
            key={type}
            onPress={() => (locked ? upgrade('missions') : !taken && add(type))}
            disabled={taken}
            accessibilityRole="button"
            accessibilityState={{ disabled: taken }}
            accessibilityLabel={`${MISSIONS[type].title}. ${MISSIONS[type].description}`}
            style={({ pressed }) => [styles.pickRow, pressed && styles.pressed]}
          >
            <View style={styles.pickIcon}>
              <Ionicons name={MISSION_ICONS[type]} size={24} color={colors.text} />
            </View>
            <Txt style={[styles.pickTitle, taken && styles.pickTaken]}>{MISSIONS[type].title}</Txt>
            {locked ? <ProTag /> : taken ? <Ionicons name="checkmark" size={26} color={colors.text} /> : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Txt style={styles.title}>Mission</Txt>
        <Txt variant="row" style={styles.count}>{`${missions.length}/${MAX_MISSIONS}`}</Txt>
      </View>
      {/* Five slots don't fit across a phone, so they scroll sideways like Alarmy's. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotScroll} contentContainerStyle={styles.slots}>
        {Array.from({ length: MAX_MISSIONS }, (_, i) => {
          const m = missions[i];
          if (m) {
            return (
              <View key={i}>
                <Pressable onPress={() => setEditing(i)} accessibilityRole="button" accessibilityLabel={`${MISSIONS[m.type].title}, ${MISSIONS[m.type].unit(m.amount)}. Edit`} style={[styles.slot, styles.slotOn]}>
                  <Ionicons name={MISSION_ICONS[m.type]} size={28} color={colors.onAccent} />
                  <Txt style={styles.slotLabel} numberOfLines={1}>{MISSIONS[m.type].title}</Txt>
                </Pressable>
                <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${MISSIONS[m.type].title}`} style={styles.remove}>
                  <Ionicons name="close" size={16} color={colors.text} />
                </Pressable>
              </View>
            );
          }
          const next = i === missions.length;
          // Free alarms take three missions; the last two slots are Pro.
          const slotLocked = !pro && i >= FREE_MISSION_SLOTS;
          return (
            <View key={i}>
              <Pressable
                onPress={() => (slotLocked ? unlock('mission_slots') : setPicking(true))}
                accessibilityRole="button"
                accessibilityLabel={slotLocked ? 'Pro: more missions' : 'Add a mission'}
                style={[styles.slot, next ? styles.slotNext : styles.slotEmpty]}
              >
                <Ionicons name={slotLocked ? 'lock-closed' : 'add'} size={slotLocked ? 20 : 26} color={next ? colors.text : colors.textFaint} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      <LinkRow title="Wake up check" value={awakeCheckLabel} onPress={onAwakeCheck} />

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Mission">
        {MISSION_GROUPS.map((g) => group(g.title, missionsIn(g.id), g.description))}
      </Sheet>

      <Sheet
        visible={edited !== undefined}
        onClose={() => {
          setEditing(null);
          setScanning(false);
        }}
        title={edited ? MISSIONS[edited.type].title : ''}
        footer={
          <Button
            title="Done"
            onPress={() => {
              setEditing(null);
              setScanning(false);
            }}
          />
        }
      >
        {edited ? (
          <>
            <Txt variant="muted">{MISSIONS[edited.type].description}</Txt>
            {MISSIONS[edited.type].research ? (
              <View style={styles.research}>
                <Ionicons name="flask-outline" size={18} color={colors.textMuted} />
                <Txt variant="caption" style={styles.flex}>{MISSIONS[edited.type].research}</Txt>
              </View>
            ) : null}
            {edited.type === 'hunt' ? (
              <View style={styles.hunt}>
                <MultiChips
                  title="What Ryz can ask for"
                  options={HUNT_ITEMS.map((i) => ({ value: i.id, label: i.label }))}
                  values={edited.objects?.length ? edited.objects : HUNT_ITEMS.map((i) => i.id)}
                  onChange={(objects) => {
                    // Keep at least one; all of them is saved as "any".
                    if (!objects.length) return;
                    update({ ...edited, objects: objects.length === HUNT_ITEMS.length ? undefined : objects });
                  }}
                />
                <Txt variant="caption">
                  {`Keep only things you have, ideally outside your bedroom. Ryz picks one at random each time${edited.objects?.length ? ` from your ${edited.objects.length}` : ''}, and "Something else" swaps it for another. Needs the full Ryz app, not Expo Go.`}
                </Txt>
              </View>
            ) : null}
            {edited.type === 'qr' ? (
              <View style={styles.qr}>
                <Txt variant="caption">
                  {edited.code ? `Saved code: …${edited.code.slice(-12)}. The alarm only stops when you scan this one.` : 'Scan a code somewhere away from your bed: a bottle in the kitchen, a sticker in the bathroom. With none saved, any code works.'}
                </Txt>
                {scanning ? (
                  <QrScanner
                    height={260}
                    onScan={(code) => {
                      haptic('success');
                      update({ ...edited, code });
                      setScanning(false);
                    }}
                  />
                ) : (
                  <Button title={edited.code ? 'Scan a different code' : 'Scan my code'} icon="qr-code-outline" variant="secondary" onPress={() => setScanning(true)} />
                )}
              </View>
            ) : (
              <>
                <Txt variant="caption">How many</Txt>
                <AmountPicker
                  value={edited.amount}
                  min={MISSIONS[edited.type].min}
                  max={MISSIONS[edited.type].max}
                  unit={MISSIONS[edited.type].unit}
                  onChange={(amount) => update({ ...edited, amount: clampAmount(edited.type, amount) })}
                />
                <Chips value={edited.amount} onChange={(amount) => update({ ...edited, amount })} options={MISSIONS[edited.type].amounts.map((n) => ({ value: n, label: String(n) }))} />
              </>
            )}
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
                  const params = { type: edited.type, amount: String(edited.amount), level: String(edited.level), code: edited.code ?? '', objects: edited.objects?.join(',') ?? '' };
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

const SLOT = 74;

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xs },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 19, lineHeight: 24, fontFamily: FONT.medium, color: colors.text },
  count: { color: colors.textMuted },
  slotScroll: { marginHorizontal: -space.xl, marginTop: space.lg, marginBottom: space.xs },
  // Room above for the remove badges, which sit outside the slots.
  slots: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm },
  slot: { width: SLOT, height: SLOT, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  slotOn: { backgroundColor: colors.accent },
  slotNext: { backgroundColor: colors.surfaceRaised },
  slotEmpty: { backgroundColor: colors.surfaceRaised, opacity: 0.6 },
  slotLabel: { fontSize: 14, lineHeight: 18, fontFamily: FONT.medium, color: colors.onAccent, paddingHorizontal: 6 },
  remove: { position: 'absolute', top: -10, right: -10, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  group: { marginBottom: space.lg },
  groupTitle: { marginBottom: space.xs },
  groupText: { marginBottom: space.sm },
  research: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  qr: { gap: space.md, paddingVertical: space.sm },
  hunt: { gap: space.xs },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 60 },
  pressed: { opacity: 0.6 },
  pickIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  pickTitle: { flex: 1, fontSize: 19, lineHeight: 24, fontFamily: FONT.regular, color: colors.text },
  pickTaken: { fontFamily: FONT.semibold },
  flex: { flex: 1 },
  sheetActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
});
