import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayPicker } from '@/components/DayPicker';
import { MissionCard } from '@/components/editor/MissionCard';
import { CATEGORY_ICON } from '@/components/ModeBadge';
import { Sheet } from '@/components/Sheet';
import { TimePicker } from '@/components/TimePicker';
import { Checkbox, Chips, LinkRow, PressableScale, Slider, Txt, haptic, ToggleRow } from '@/components/ui';
import { newAlarm } from '@/core/defaults';
import { makeId } from '@/core/ring';
import { formatSpan, nextClock, nextOccurrence } from '@/core/time';
import { SOUNDS, SOUND_CATEGORIES, soundsIn } from '@/core/sounds';
import type { Alarm, AlarmSoundId } from '@/core/types';
import { requestPermissions } from '@/services/notifications';
import { usePreview } from '@/services/sound';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { colors, radius, space } from '@/theme';

const soundTitle = (id: AlarmSoundId) => (SOUNDS[id] ?? SOUNDS.gentle).title;
const minutes = (values: number[]) => values.map((v) => ({ value: v, label: `${v} min` }));
const fadeLabel = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`);
const PREVIEW_SECONDS = 6;
const PREVIEW_PROGRESS = {
  animationName: { from: { transform: [{ scaleX: 0 }] }, to: { transform: [{ scaleX: 1 }] } },
  animationDuration: `${PREVIEW_SECONDS}s`,
  animationTimingFunction: 'linear',
} as const;

type SheetName = 'sound' | 'gentle' | 'ring' | 'snooze' | 'check' | null;

export default function EditAlarm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveAlarm, deleteAlarm } = useStore();
  const existing = data.alarms.find((a) => a.id === id);
  const [draft, setDraft] = useState<Alarm>(() => existing ?? newAlarm(makeId()));
  const [sheet, setSheet] = useState<SheetName>(null);
  const [playing, setPlaying] = useState<AlarmSoundId | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preview = usePreview();
  const permissions = usePermissions();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const set = (patch: Partial<Alarm>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => () => {
    if (playTimer.current) clearTimeout(playTimer.current);
  }, []);

  const togglePlay = (sound: AlarmSoundId) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    if (playing === sound) {
      preview.stop();
      setPlaying(null);
      return;
    }
    preview.play(sound, PREVIEW_SECONDS, draft.volume);
    setPlaying(sound);
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
  // A one-time alarm gets its date on save, so here it's simply the next time the clock shows it.
  const ringsAt = draft.days.length === 0 ? nextClock(draft.hour, draft.minute, now) : nextOccurrence({ ...draft, enabled: true }, now);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? space.md : insets.top + space.sm }]}>
        <View style={styles.headerSide} />
        <Text style={styles.title} accessibilityRole="header">{existing ? 'Edit alarm' : 'Wake-up alarm'}</Text>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close without saving" style={[styles.headerSide, styles.right]}>
          <Ionicons name="close" size={32} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.nameRow}>
          <Ionicons name="alarm" size={28} color={colors.text} />
          <TextInput
            value={draft.label}
            onChangeText={(label) => set({ label })}
            placeholder="Name this alarm"
            placeholderTextColor={colors.textFaint}
            style={styles.name}
            returnKeyType="done"
            maxLength={40}
            accessibilityLabel="Alarm name"
          />
          <Ionicons name="pencil" size={22} color={colors.textFaint} />
        </View>

        <Text style={styles.ringIn} accessibilityLiveRegion="polite">{ringsAt ? `Ring in ${formatSpan(ringsAt - now)}` : ' '}</Text>

        <TimePicker hour={draft.hour} minute={draft.minute} use24h={data.settings.use24h} onChange={(hour, minute) => set({ hour, minute })} />

        <View style={styles.days}>
          <DayPicker days={draft.days} onChange={(days) => set({ days })} />
        </View>

        <MissionCard missions={draft.missions} onChange={(missions) => set({ missions })} awakeCheckLabel={checkLabel} onAwakeCheck={() => setSheet('check')} />

        <Txt variant="section" style={styles.sectionLabel}>Alarm sound</Txt>
        <View style={styles.card}>
          {/* Siblings, not nested: a button inside a button isn't allowed on web and confuses screen readers. */}
          <View style={styles.soundRow}>
            <Pressable
              onPress={() => togglePlay(draft.sound)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={playing === draft.sound ? 'Stop preview' : 'Play preview'}
              style={styles.play}
            >
              <Ionicons name={playing === draft.sound ? 'stop' : 'play'} size={18} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => setSheet('sound')} accessibilityRole="button" accessibilityLabel={`Sound: ${soundTitle(draft.sound)}. Change`} style={({ pressed }) => [styles.soundPick, pressed && styles.pressed]}>
              <Txt style={styles.soundName} numberOfLines={1}>{soundTitle(draft.sound)}</Txt>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.progress} accessible={false}>
            {playing === draft.sound ? <Animated.View key={String(playing)} style={[styles.progressFill, PREVIEW_PROGRESS]} /> : <View style={styles.progressDot} />}
          </View>
          <View style={styles.volumeRow}>
            <Ionicons name="volume-medium" size={26} color={colors.text} />
            <Slider value={draft.volume} min={0.1} onChange={(volume) => set({ volume })} label="Alarm volume" />
            <MaterialCommunityIcons name="vibrate" size={26} color={colors.text} />
            <Checkbox checked={draft.vibrate} onChange={(vibrate) => set({ vibrate })} label="Vibration" />
          </View>
          <LinkRow title="Gentle wake-up" value={draft.mode === 'gentle' ? fadeLabel(draft.fadeInSeconds) : 'Off'} onPress={() => (draft.mode === 'gentle' ? setSheet('gentle') : setSheet('sound'))} />
          <LinkRow title="Keep ringing" value={`${draft.ringMinutes} min`} onPress={() => setSheet('ring')} />
        </View>

        <Txt variant="section" style={styles.sectionLabel}>Custom setting</Txt>
        <View style={styles.card}>
          <LinkRow title="Snooze" value={snoozeLabel} onPress={() => setSheet('snooze')} />
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
        <PressableScale onPress={save} style={styles.save} accessibilityLabel="Save">
          <Text style={styles.saveText}>Save</Text>
        </PressableScale>
      </View>

      <Sheet visible={sheet === 'sound'} onClose={() => setSheet(null)} title="Alarm sound">
        {SOUND_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.soundGroup}>
            <View style={styles.groupHead}>
              <Ionicons name={CATEGORY_ICON[category.id]} size={18} color={colors.textMuted} />
              <Txt variant="section">{category.title}</Txt>
            </View>
            <Txt variant="caption" style={styles.groupText}>{category.description}</Txt>
            {soundsIn(category.id).map((id) => {
              const on = draft.sound === id;
              return (
                <View key={id} style={styles.soundOption}>
                  <Pressable onPress={() => togglePlay(id)} hitSlop={6} accessibilityRole="button" accessibilityLabel={playing === id ? 'Stop preview' : `Play ${SOUNDS[id].title}`} style={styles.playSmall}>
                    <Ionicons name={playing === id ? 'stop' : 'play'} size={16} color={colors.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!on) haptic('select');
                      set({ sound: id, mode: SOUNDS[id].mode });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={SOUNDS[id].description ? `${SOUNDS[id].title}. ${SOUNDS[id].description}` : SOUNDS[id].title}
                    style={({ pressed }) => [styles.soundPickRow, pressed && styles.pressed]}
                  >
                    <View style={styles.flex}>
                      <Txt style={[styles.optionTitle, on && styles.optionTitleOn]}>{SOUNDS[id].title}</Txt>
                      {SOUNDS[id].description ? <Txt variant="caption">{SOUNDS[id].description}</Txt> : null}
                    </View>
                    {on ? <Ionicons name="checkmark" size={24} color={colors.text} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  headerSide: { width: 44, height: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: colors.text },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.sm, paddingVertical: space.lg },
  name: { flex: 1, minWidth: 0, fontSize: 19, fontWeight: '500', color: colors.text, paddingVertical: space.sm },
  ringIn: { fontSize: 19, lineHeight: 24, fontWeight: '500', color: colors.text, textAlign: 'center', marginTop: space.md, marginBottom: space.lg },
  days: { marginTop: space.xl, marginBottom: space.md },
  sectionLabel: { marginLeft: space.sm, marginTop: space.lg, marginBottom: -space.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.xl, paddingVertical: space.sm },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingTop: space.lg, paddingBottom: space.md },
  play: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  pressed: { opacity: 0.6 },
  soundPick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  soundName: { flex: 1, fontSize: 19, lineHeight: 24, fontWeight: '500', color: colors.text },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden', justifyContent: 'center', marginVertical: space.sm },
  progressFill: { height: '100%', width: '100%', backgroundColor: colors.text, transformOrigin: 'left' },
  progressDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 1, backgroundColor: colors.textMuted },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  delete: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.xl, minHeight: 44 },
  deleteText: { fontSize: 17, fontWeight: '600', color: colors.danger },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.bg },
  save: { height: 56, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 19, fontWeight: '700', color: colors.onAccent },
  soundGroup: { marginBottom: space.lg },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  groupText: { marginTop: 2, marginBottom: space.xs },
  soundOption: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60 },
  soundPickRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  optionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '500', color: colors.text },
  optionTitleOn: { fontWeight: '700' },
  playSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
});
