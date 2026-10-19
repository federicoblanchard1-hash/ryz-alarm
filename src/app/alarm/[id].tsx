import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayPicker } from '@/components/DayPicker';
import { MissionPicker } from '@/components/MissionPicker';
import { MODE_ICON } from '@/components/ModeBadge';
import { TimePicker } from '@/components/TimePicker';
import { Button, Chips, Divider, PressableScale, Section, ToggleRow, Txt, haptic } from '@/components/ui';
import { newAlarm } from '@/core/defaults';
import { makeId } from '@/core/ring';
import type { Alarm, WakeMode } from '@/core/types';
import { requestPermissions } from '@/services/notifications';
import { usePreview } from '@/services/sound';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { colors, radius, space } from '@/theme';

const MODES: { mode: WakeMode; title: string; text: string }[] = [
  { mode: 'gentle', title: 'Gentle', text: 'A melody that starts almost silent and slowly gets louder. For normal sleepers.' },
  { mode: 'deep', title: 'Deep sleeper', text: 'A low 520 Hz tone in bursts of three. It woke far more deep sleepers than high beeps in tests.' },
];

const minutes = (values: number[]) => values.map((v) => ({ value: v, label: `${v} min` }));

function ModeCard({ selected, onSelect, onListen, mode, title, text }: (typeof MODES)[number] & { selected: boolean; onSelect: () => void; onListen: () => void }) {
  return (
    <Pressable onPress={onSelect} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${title}. ${text}`} style={[styles.mode, selected && styles.modeOn]}>
      <View style={styles.modeTop}>
        <Ionicons name={MODE_ICON[mode]} size={22} color={colors.text} />
        <Txt variant="heading" style={styles.flex}>{title}</Txt>
        <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.text : colors.textFaint} />
      </View>
      <Txt variant="caption">{text}</Txt>
      <PressableScale onPress={onListen} style={styles.listen} accessibilityLabel={`Listen to ${title}`}>
        <Ionicons name="play" size={14} color={colors.text} />
        <Txt style={styles.listenText}>Listen</Txt>
      </PressableScale>
    </Pressable>
  );
}

export default function EditAlarm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveAlarm, deleteAlarm } = useStore();
  const existing = data.alarms.find((a) => a.id === id);
  const [draft, setDraft] = useState<Alarm>(() => existing ?? newAlarm(makeId()));
  const preview = usePreview();
  const permissions = usePermissions();
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<Alarm>) => setDraft((d) => ({ ...d, ...patch }));

  const close = () => {
    preview.stop();
    // Opened from a link there's nothing to go back to.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const save = async () => {
    saveAlarm({ ...draft, enabled: true });
    haptic('success');
    if (permissions.supported && permissions.state?.notifications === 'undetermined') await requestPermissions();
    close();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? space.md : insets.top + space.sm }]}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" style={styles.headerButton}>
          <Txt variant="body" style={{ color: colors.textMuted }}>Cancel</Txt>
        </Pressable>
        <Txt variant="heading">{existing ? 'Edit alarm' : 'New alarm'}</Txt>
        <Pressable onPress={save} hitSlop={12} accessibilityRole="button" style={[styles.headerButton, styles.right]}>
          <Txt variant="heading">Save</Txt>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <TimePicker hour={draft.hour} minute={draft.minute} use24h={data.settings.use24h} onChange={(hour, minute) => set({ hour, minute })} />

        <Section label="Repeat">
          <DayPicker days={draft.days} onChange={(days) => set({ days })} />
        </Section>

        <Section label="Label">
          <TextInput
            value={draft.label}
            onChangeText={(label) => set({ label })}
            placeholder="Work, gym, school…"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            returnKeyType="done"
            maxLength={40}
            accessibilityLabel="Alarm label"
          />
        </Section>

        <View style={styles.group}>
          <Txt variant="label" style={styles.groupLabel}>Sound</Txt>
          {MODES.map((m) => (
            <ModeCard
              key={m.mode}
              {...m}
              selected={draft.mode === m.mode}
              onSelect={() => {
                if (draft.mode !== m.mode) haptic('select');
                set({ mode: m.mode });
              }}
              onListen={() => preview.play(m.mode)}
            />
          ))}
        </View>

        <MissionPicker missions={draft.missions} onChange={(missions) => set({ missions })} />

        {draft.mode === 'gentle' ? (
          <Section label="Gentle wake-up" footer="If you sleep through the melody, the deep sleeper tone takes over.">
            <Chips
              title="Fade in over"
              value={draft.fadeInSeconds}
              onChange={(fadeInSeconds) => set({ fadeInSeconds })}
              options={[
                { value: 30, label: '30 s' },
                { value: 60, label: '1 min' },
                { value: 120, label: '2 min' },
                { value: 300, label: '5 min' },
              ]}
            />
            <Divider />
            <ToggleRow title="Switch to the deep tone" description="If you're still asleep" value={draft.escalate} onChange={(escalate) => set({ escalate })} />
            {draft.escalate ? <Chips title="After" value={draft.escalateAfterMinutes} onChange={(escalateAfterMinutes) => set({ escalateAfterMinutes })} options={minutes([1, 2, 3, 5])} /> : null}
          </Section>
        ) : null}

        <Section label="Ringing" footer="If nobody touches it, the alarm snoozes itself when snoozes are left.">
          <ToggleRow title="Vibrate" value={draft.vibrate} onChange={(vibrate) => set({ vibrate })} />
          <Divider />
          <Chips title="Keep ringing for" value={draft.ringMinutes} onChange={(ringMinutes) => set({ ringMinutes })} options={minutes([5, 10, 15])} />
        </Section>

        <Section label="Snooze" footer="Snoozing for up to about 30 minutes didn't hurt sleep or mood in a 2023 study.">
          <ToggleRow title="Allow snooze" value={draft.snooze.enabled} onChange={(enabled) => set({ snooze: { ...draft.snooze, enabled } })} />
          {draft.snooze.enabled ? (
            <>
              <Divider />
              <Chips title="Length" value={draft.snooze.minutes} onChange={(m) => set({ snooze: { ...draft.snooze, minutes: m } })} options={minutes([5, 9, 10, 15, 20, 30])} />
              <Chips
                title="How many times"
                value={draft.snooze.limit}
                onChange={(limit) => set({ snooze: { ...draft.snooze, limit } })}
                options={[1, 2, 3, 5].map((v) => ({ value: v, label: String(v) }))}
              />
            </>
          ) : null}
        </Section>

        <Section label="Are you awake?" footer="Stops you falling back asleep: if you don't answer, the alarm rings again.">
          <ToggleRow
            title="Check that I'm awake"
            description="Asks a few minutes after you stop the alarm"
            value={draft.awakeCheck.enabled}
            onChange={(enabled) => set({ awakeCheck: { ...draft.awakeCheck, enabled } })}
          />
          {draft.awakeCheck.enabled ? (
            <>
              <Divider />
              <Chips title="Ask after" value={draft.awakeCheck.delayMinutes} onChange={(delayMinutes) => set({ awakeCheck: { ...draft.awakeCheck, delayMinutes } })} options={minutes([3, 5, 10])} />
              <Chips title="Answer within" value={draft.awakeCheck.answerMinutes} onChange={(answerMinutes) => set({ awakeCheck: { ...draft.awakeCheck, answerMinutes } })} options={minutes([2, 3, 5])} />
            </>
          ) : null}
        </Section>

        {existing ? (
          <Button
            title="Delete alarm"
            icon="trash-outline"
            variant="danger"
            onPress={() => {
              deleteAlarm(existing.id);
              close();
            }}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  headerButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  content: { paddingHorizontal: space.lg, gap: space.xl },
  input: { fontSize: 17, color: colors.text, paddingVertical: space.md, minHeight: 52 },
  group: { gap: space.sm },
  groupLabel: { marginLeft: space.xs },
  mode: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeOn: { borderColor: colors.text },
  modeTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  listen: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    marginTop: space.xs,
  },
  listenText: { fontSize: 14, fontWeight: '600', color: colors.text },
});
