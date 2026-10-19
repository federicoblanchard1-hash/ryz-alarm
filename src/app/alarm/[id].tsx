import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayPicker } from '@/components/DayPicker';
import { MissionCard } from '@/components/editor/MissionCard';
import { MODE_ICON } from '@/components/ModeBadge';
import { Sheet } from '@/components/Sheet';
import { TimePicker } from '@/components/TimePicker';
import { Button, Chips, Divider, LinkRow, Txt, haptic, ToggleRow } from '@/components/ui';
import { newAlarm } from '@/core/defaults';
import { makeId } from '@/core/ring';
import type { Alarm, WakeMode } from '@/core/types';
import { requestPermissions } from '@/services/notifications';
import { usePreview } from '@/services/sound';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { colors, radius, space } from '@/theme';

const SOUNDS: { mode: WakeMode; title: string; text: string }[] = [
  { mode: 'gentle', title: 'Gentle melody', text: 'Starts almost silent and slowly gets louder. For normal sleepers.' },
  { mode: 'deep', title: 'Deep sleeper · 520 Hz', text: 'A low tone in bursts of three. It woke far more deep sleepers than high beeps in tests. Hold to stop.' },
];
const soundTitle = (mode: WakeMode) => SOUNDS.find((s) => s.mode === mode)!.title;
const minutes = (values: number[]) => values.map((v) => ({ value: v, label: `${v} min` }));
const fadeLabel = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`);
const PREVIEW_SECONDS = 6;

type SheetName = 'sound' | 'gentle' | 'ring' | 'snooze' | 'check' | null;

export default function EditAlarm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveAlarm, deleteAlarm } = useStore();
  const existing = data.alarms.find((a) => a.id === id);
  const [draft, setDraft] = useState<Alarm>(() => existing ?? newAlarm(makeId()));
  const [sheet, setSheet] = useState<SheetName>(null);
  const [playing, setPlaying] = useState<WakeMode | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preview = usePreview();
  const permissions = usePermissions();
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<Alarm>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => () => {
    if (playTimer.current) clearTimeout(playTimer.current);
  }, []);

  const togglePlay = (mode: WakeMode) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    if (playing === mode) {
      preview.stop();
      setPlaying(null);
      return;
    }
    preview.play(mode, PREVIEW_SECONDS);
    setPlaying(mode);
    playTimer.current = setTimeout(() => setPlaying(null), PREVIEW_SECONDS * 1000);
  };

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

  const { snooze, awakeCheck } = draft;
  const checkLabel = awakeCheck.enabled ? `After ${awakeCheck.delayMinutes} min` : 'Off';
  const snoozeLabel = snooze.enabled ? `${snooze.minutes} min, ${snooze.limit}×` : 'Off';
  const gentleLabel = draft.escalate ? `${fadeLabel(draft.fadeInSeconds)} · then 520 Hz` : fadeLabel(draft.fadeInSeconds);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? space.md : insets.top + space.sm }]}>
        <View style={styles.headerSide} />
        <Txt variant="heading" accessibilityRole="header">{existing ? 'Edit alarm' : 'Wake-up alarm'}</Txt>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close without saving" style={[styles.headerSide, styles.right]}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        <TimePicker hour={draft.hour} minute={draft.minute} use24h={data.settings.use24h} onChange={(hour, minute) => set({ hour, minute })} />

        <View style={styles.card}>
          <DayPicker days={draft.days} onChange={(days) => set({ days })} />
        </View>

        <MissionCard missions={draft.missions} onChange={(missions) => set({ missions })} awakeCheckLabel={checkLabel} onAwakeCheck={() => setSheet('check')} />

        <Txt variant="label" style={styles.sectionLabel}>Alarm sound</Txt>
        <View style={styles.card}>
          {/* Siblings, not nested: a button inside a button isn't allowed on web and confuses screen readers. */}
          <View style={styles.soundRow}>
            <Pressable
              onPress={() => togglePlay(draft.mode)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={playing === draft.mode ? 'Stop preview' : 'Play preview'}
              style={styles.play}
            >
              <Ionicons name={playing === draft.mode ? 'stop' : 'play'} size={20} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => setSheet('sound')} accessibilityRole="button" accessibilityLabel={`Sound: ${soundTitle(draft.mode)}. Change`} style={({ pressed }) => [styles.soundPick, pressed && styles.pressed]}>
              <Txt variant="heading" style={styles.flex}>{soundTitle(draft.mode)}</Txt>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          </View>
          <Divider />
          <ToggleRow title="Vibration" value={draft.vibrate} onChange={(vibrate) => set({ vibrate })} />
          {draft.mode === 'gentle' ? (
            <>
              <Divider />
              <LinkRow title="Gentle wake-up" value={gentleLabel} onPress={() => setSheet('gentle')} />
            </>
          ) : null}
          <Divider />
          <LinkRow title="Keep ringing" value={`${draft.ringMinutes} min`} onPress={() => setSheet('ring')} />
        </View>

        <Txt variant="label" style={styles.sectionLabel}>Custom setting</Txt>
        <View style={styles.card}>
          <LinkRow title="Snooze" value={snoozeLabel} onPress={() => setSheet('snooze')} />
          <Divider />
          <View style={styles.labelRow}>
            <Txt variant="body">Label</Txt>
            <TextInput
              value={draft.label}
              onChangeText={(label) => set({ label })}
              placeholder="Work, gym…"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              returnKeyType="done"
              maxLength={40}
              accessibilityLabel="Alarm label"
            />
          </View>
        </View>

        {existing ? (
          <Pressable
            onPress={() => {
              deleteAlarm(existing.id);
              close();
            }}
            accessibilityRole="button"
            style={styles.delete}
          >
            <Txt style={styles.deleteText}>Delete alarm</Txt>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button title="Save" onPress={save} />
      </View>

      <Sheet visible={sheet === 'sound'} onClose={() => setSheet(null)} title="Alarm sound">
        {SOUNDS.map((s) => {
          const on = draft.mode === s.mode;
          return (
            <View key={s.mode}>
              <Pressable
                onPress={() => {
                  if (!on) haptic('select');
                  set({ mode: s.mode });
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${s.title}. ${s.text}`}
                style={[styles.option, on && styles.optionOn]}
              >
                <View style={styles.optionTop}>
                  <Ionicons name={MODE_ICON[s.mode]} size={22} color={colors.text} />
                  <Txt variant="heading" style={styles.flex}>{s.title}</Txt>
                </View>
                <Txt variant="caption">{s.text}</Txt>
              </Pressable>
              <Pressable onPress={() => togglePlay(s.mode)} hitSlop={8} accessibilityRole="button" accessibilityLabel={playing === s.mode ? 'Stop preview' : `Play ${s.title}`} style={styles.playSmall}>
                <Ionicons name={playing === s.mode ? 'stop' : 'play'} size={16} color={colors.text} />
              </Pressable>
            </View>
          );
        })}
      </Sheet>

      <Sheet visible={sheet === 'gentle'} onClose={() => setSheet(null)} title="Gentle wake-up">
        <Chips
          title="Fade in over"
          value={draft.fadeInSeconds}
          onChange={(fadeInSeconds) => set({ fadeInSeconds })}
          options={[30, 60, 120, 300].map((v) => ({ value: v, label: fadeLabel(v) }))}
        />
        <ToggleRow title="Switch to the 520 Hz tone" description="If you sleep through the melody" value={draft.escalate} onChange={(escalate) => set({ escalate })} />
        {draft.escalate ? <Chips title="After" value={draft.escalateAfterMinutes} onChange={(escalateAfterMinutes) => set({ escalateAfterMinutes })} options={minutes([1, 2, 3, 5])} /> : null}
      </Sheet>

      <Sheet visible={sheet === 'ring'} onClose={() => setSheet(null)} title="Keep ringing">
        <Chips value={draft.ringMinutes} onChange={(ringMinutes) => set({ ringMinutes })} options={minutes([5, 10, 15])} />
        <Txt variant="caption">If nobody touches it, the alarm snoozes itself when snoozes are left.</Txt>
      </Sheet>

      <Sheet visible={sheet === 'snooze'} onClose={() => setSheet(null)} title="Snooze">
        <ToggleRow title="Allow snooze" value={snooze.enabled} onChange={(enabled) => set({ snooze: { ...snooze, enabled } })} />
        {snooze.enabled ? (
          <>
            <Chips title="Length" value={snooze.minutes} onChange={(m) => set({ snooze: { ...snooze, minutes: m } })} options={minutes([5, 9, 10, 15, 20, 30])} />
            <Chips title="How many times" value={snooze.limit} onChange={(limit) => set({ snooze: { ...snooze, limit } })} options={[1, 2, 3, 5].map((v) => ({ value: v, label: String(v) }))} />
          </>
        ) : null}
        <Txt variant="caption">{"Snoozing for up to about 30 minutes didn't hurt sleep or mood in a 2023 study."}</Txt>
      </Sheet>

      <Sheet visible={sheet === 'check'} onClose={() => setSheet(null)} title="Wake up check">
        <ToggleRow title="Check that I'm awake" description="Asks a few minutes after you stop the alarm" value={awakeCheck.enabled} onChange={(enabled) => set({ awakeCheck: { ...awakeCheck, enabled } })} />
        {awakeCheck.enabled ? (
          <>
            <Chips title="Ask after" value={awakeCheck.delayMinutes} onChange={(delayMinutes) => set({ awakeCheck: { ...awakeCheck, delayMinutes } })} options={minutes([3, 5, 10])} />
            <Chips title="Answer within" value={awakeCheck.answerMinutes} onChange={(answerMinutes) => set({ awakeCheck: { ...awakeCheck, answerMinutes } })} options={minutes([2, 3, 5])} />
          </>
        ) : null}
        <Txt variant="caption">{"Stops you falling back asleep: if you don't answer, the alarm rings again."}</Txt>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.md },
  headerSide: { width: 44, height: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  sectionLabel: { marginLeft: space.xs, marginTop: space.sm, marginBottom: -space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: space.lg },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  play: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  soundPick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  playSmall: { position: 'absolute', top: space.md, right: space.md, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  input: { flex: 1, fontSize: 16, color: colors.text, textAlign: 'right', paddingVertical: space.md },
  delete: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.xl, minHeight: 44 },
  deleteText: { fontSize: 16, fontWeight: '600', color: colors.danger },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.bg },
  option: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  optionOn: { borderColor: colors.text },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
