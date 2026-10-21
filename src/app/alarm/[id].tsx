import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayPicker } from '@/components/DayPicker';
import { AmountPicker } from '@/components/AmountPicker';
import { MissionCard } from '@/components/editor/MissionCard';
import { ProTag } from '@/components/ProTag';
import { CATEGORY_ICON } from '@/components/ModeBadge';
import { Sheet } from '@/components/Sheet';
import { TimePicker } from '@/components/TimePicker';
import { Slider } from '@/components/Slider';
import { LinkRow, PressableScale, Txt, haptic, ToggleRow } from '@/components/ui';
import { newAlarm } from '@/core/defaults';
import { FREE_SOUNDS, FREE_VIBRATIONS, type ProFeature } from '@/core/pro';
import { makeId } from '@/core/ring';
import { formatSpan, nextClock, nextOccurrence, skippable } from '@/core/time';
import { SOUNDS, SOUND_CATEGORIES, soundsIn, type SoundCategory } from '@/core/sounds';
import type { Alarm, AlarmSoundId } from '@/core/types';
import { requestPermissions } from '@/services/notifications';
import { VIBRATIONS, VIBRATION_IDS } from '@/core/vibration';
import { pickSong } from '@/services/song';
import { previewVibration, stopVibration, usePreview } from '@/services/sound';
import { useNow } from '@/state/useNow';
import { usePro } from '@/state/usePro';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { FONT, colors, radius, space } from '@/theme';

const soundTitle = (id: AlarmSoundId) => (SOUNDS[id] ?? SOUNDS.gentle).title;
const fadeLabel = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`);
const PREVIEW_SECONDS = 6;
const PREVIEW_PROGRESS = {
  animationName: { from: { transform: [{ scaleX: 0 }] }, to: { transform: [{ scaleX: 1 }] } },
  animationDuration: `${PREVIEW_SECONDS}s`,
  animationTimingFunction: 'linear',
} as const;

type SheetName = 'sound' | 'vibration' | 'quiet' | 'gentle' | 'ring' | 'snooze' | 'check' | null;

export default function EditAlarm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveAlarm, deleteAlarm } = useStore();
  const existing = data.alarms.find((a) => a.id === id);
  const [draft, setDraft] = useState<Alarm>(() => existing ?? newAlarm(makeId()));
  const [sheet, setSheet] = useState<SheetName>(null);
  const [playing, setPlaying] = useState<AlarmSoundId | null>(null);
  const [soundTab, setSoundTab] = useState<SoundCategory>(() => (SOUNDS[draft.sound] ?? SOUNDS.gentle).category);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preview = usePreview();
  const { pro, unlock } = usePro();
  // Previews are free; choosing a Pro sound or pattern opens the paywall (after closing the sheet, which would cover it).
  const upgrade = (feature: ProFeature) => {
    preview.stop();
    setSheet(null);
    unlock(feature);
  };
  // Something already chosen (say, during the trial) stays usable.
  const soundLocked = (id: AlarmSoundId) => !pro && !FREE_SOUNDS.includes(id) && existing?.sound !== id;
  const vibrationLocked = (id: Alarm['vibration']) => !pro && !FREE_VIBRATIONS.includes(id) && existing?.vibration !== id;
  const permissions = usePermissions();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const set = (patch: Partial<Alarm>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => () => {
    if (playTimer.current) clearTimeout(playTimer.current);
    stopVibration();
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
  // "Skip the next one" for a holiday or a day off: the ring after now, ignoring any skip already set.
  const skipAt = skippable({ ...draft, hour: draft.hour, minute: draft.minute }, now);
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
          <DayPicker days={draft.days} onChange={(days) => set({ days, skip: undefined })} />
        </View>
        {draft.days.length > 0 && skipAt !== null ? (
          <Pressable
            onPress={() => {
              haptic('select');
              set({ skip: draft.skip === skipAt ? undefined : skipAt });
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: draft.skip === skipAt }}
            style={[styles.skipChip, draft.skip === skipAt && styles.skipChipOn]}
          >
            <Ionicons name={draft.skip === skipAt ? 'checkmark' : 'play-skip-forward-outline'} size={14} color={draft.skip === skipAt ? colors.onAccent : colors.text} />
            <Text style={[styles.skipText, draft.skip === skipAt && styles.skipTextOn]}>{`Skip the next one · ${SKIP_DATE.format(skipAt)}`}</Text>
          </Pressable>
        ) : null}

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
            <Pressable
              onPress={() => {
                setSoundTab((SOUNDS[draft.sound] ?? SOUNDS.gentle).category);
                setSheet('sound');
              }}
              accessibilityRole="button" accessibilityLabel={`Sound: ${soundTitle(draft.sound)}. Change`} style={({ pressed }) => [styles.soundPick, pressed && styles.pressed]}>
              <Txt style={styles.soundName} numberOfLines={1}>{draft.song ? draft.song.name : soundTitle(draft.sound)}</Txt>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.progress} accessible={false}>
            {playing === draft.sound ? <Animated.View key={String(playing)} style={[styles.progressFill, PREVIEW_PROGRESS]} /> : <View style={styles.progressDot} />}
          </View>
          <View style={styles.volumeRow}>
            <Ionicons name={draft.volume < 0.4 ? 'volume-low' : 'volume-high'} size={26} color={colors.text} />
            <Slider
              value={draft.volume}
              min={0.1}
              label="Alarm volume"
              showValue
              // Play the sound while you drag, so you hear the level you're picking.
              onSlideStart={() => playing !== draft.sound && togglePlay(draft.sound)}
              onSlide={(v) => preview.setVolume(v)}
              onChange={(volume) => {
                preview.setVolume(volume);
                set({ volume });
              }}
            />
          </View>
          <LinkRow title="Vibration" value={draft.vibrate ? VIBRATIONS[draft.vibration]?.title ?? 'On' : 'Off'} onPress={() => setSheet('vibration')} />
          <LinkRow title="Wake only me" value={draft.quietStartSeconds ? `Buzz ${draft.quietStartSeconds} s first` : 'Off'} onPress={() => setSheet('quiet')} />
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
        <View style={styles.songBox}>
          <Ionicons name="musical-note" size={20} color={colors.text} />
          <View style={styles.flex}>
            <Txt style={styles.optionTitle} numberOfLines={1}>{draft.song ? draft.song.name : 'Your own song'}</Txt>
            <Txt variant="caption">{draft.song ? 'Plays while Ryz is open. If Ryz is closed, the sound below rings.' : 'Any song you have as a file (MP3, M4A…), from Files.'}</Txt>
          </View>
          {draft.song ? (
            <Pressable onPress={() => set({ song: undefined })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove your song">
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                pickSong()
                  .then((song) => song && set({ song }))
                  .catch(() => {});
              }}
              accessibilityRole="button"
              style={styles.songPick}
            >
              <Txt style={styles.songPickText}>Choose</Txt>
            </Pressable>
          )}
        </View>
        <Txt variant="caption">Spotify and Apple Music songs can’t be alarm sounds (they only play inside their own apps). Add one as Morning music in Settings → Alarms, and it plays once you’re up.</Txt>
        <View style={styles.tabs} accessibilityRole="tablist">
          {SOUND_CATEGORIES.map((c) => {
            const on = soundTab === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  if (!on) haptic('select');
                  setSoundTab(c.id);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Ionicons name={CATEGORY_ICON[c.id]} size={16} color={on ? colors.onAccent : colors.text} />
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{c.title}</Text>
              </Pressable>
            );
          })}
        </View>
        {SOUND_CATEGORIES.filter((c) => c.id === soundTab).map((category) => (
          <View key={category.id}>
            <Txt variant="caption" style={styles.groupText}>{category.description}</Txt>
            {category.groups.map((group) => (
              <View key={group} style={styles.soundGroup}>
                <Txt variant="label" style={styles.subhead}>{group}</Txt>
                {soundsIn(category.id, group).map((id) => {
                  const on = draft.sound === id;
                  return (
                    <View key={id} style={styles.soundOption}>
                      <Pressable onPress={() => togglePlay(id)} hitSlop={6} accessibilityRole="button" accessibilityLabel={playing === id ? 'Stop preview' : `Play ${SOUNDS[id].title}`} style={[styles.playSmall, playing === id && styles.playSmallOn]}>
                        <Ionicons name={playing === id ? 'stop' : 'play'} size={16} color={playing === id ? colors.onAccent : colors.text} />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (soundLocked(id)) return upgrade('sounds');
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
                        {on ? <Ionicons name="checkmark" size={24} color={colors.text} /> : soundLocked(id) ? <ProTag /> : null}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ))}
      </Sheet>

      <Sheet
        visible={sheet === 'vibration'}
        onClose={() => {
          stopVibration();
          setSheet(null);
        }}
        title="Vibration"
      >
        <ToggleRow
          title="Vibrate"
          description="While the alarm rings. It pauses during missions so it can't count as shakes or squats."
          value={draft.vibrate}
          onChange={(vibrate) => {
            set({ vibrate });
            if (vibrate) previewVibration(draft.vibration);
            else stopVibration();
          }}
        />
        {draft.vibrate
          ? VIBRATION_IDS.map((id) => {
              const on = draft.vibration === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    previewVibration(id);
                    if (vibrationLocked(id)) return upgrade('vibrations');
                    set({ vibration: id });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [styles.vibeOption, pressed && styles.pressed]}
                >
                  <Txt style={[styles.optionTitle, on && styles.optionTitleOn, styles.flex]}>{VIBRATIONS[id].title}</Txt>
                  {on ? <Ionicons name="checkmark" size={24} color={colors.text} /> : vibrationLocked(id) ? <ProTag /> : null}
                </Pressable>
              );
            })
          : null}
        <Txt variant="caption">
          {Platform.OS === 'ios' ? 'Tap a pattern to feel it. iPhones buzz for a fixed length, so patterns differ in rhythm.' : 'Tap a pattern to feel it.'}
        </Txt>
      </Sheet>

      <Sheet visible={sheet === 'quiet'} onClose={() => setSheet(null)} title="Wake only me">
        <ToggleRow
          title="Vibrate before the sound"
          description="Keep your phone in your pocket or under your pillow: it buzzes first, and the sound only starts if you don't react. Works while Ryz is open."
          value={Boolean(draft.quietStartSeconds)}
          onChange={(on) => set({ quietStartSeconds: on ? 30 : 0 })}
        />
        {draft.quietStartSeconds ? (
          <AmountPicker title="Sound starts after" value={draft.quietStartSeconds} min={10} max={120} step={5} unit={(n) => `${n} seconds`} onChange={(quietStartSeconds) => set({ quietStartSeconds })} />
        ) : null}
      </Sheet>

      <Sheet visible={sheet === 'gentle'} onClose={() => setSheet(null)} title="Gentle wake-up">
        <AmountPicker
          title="Fade in over"
          value={draft.fadeInSeconds}
          min={10}
          max={600}
          step={5}
          unit={(n) => `${n} seconds`}
          hint={(n) => (n >= 60 ? fadeLabel(n) : null)}
          onChange={(fadeInSeconds) => set({ fadeInSeconds })}
        />
        <ToggleRow title="Switch to the 520 Hz tone" description="If you sleep through the melody" value={draft.escalate} onChange={(escalate) => set({ escalate })} />
        {draft.escalate ? <AmountPicker title="After" value={draft.escalateAfterMinutes} min={1} max={30} unit={(n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`} onChange={(escalateAfterMinutes) => set({ escalateAfterMinutes })} /> : null}
      </Sheet>

      <Sheet visible={sheet === 'ring'} onClose={() => setSheet(null)} title="Keep ringing">
        <AmountPicker value={draft.ringMinutes} min={1} max={60} unit={(n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`} onChange={(ringMinutes) => set({ ringMinutes })} />
        <Txt variant="caption">If nobody touches it, the alarm snoozes itself when snoozes are left.</Txt>
      </Sheet>

      <Sheet visible={sheet === 'snooze'} onClose={() => setSheet(null)} title="Snooze">
        <ToggleRow title="Allow snooze" value={snooze.enabled} onChange={(enabled) => set({ snooze: { ...snooze, enabled } })} />
        {snooze.enabled ? (
          <>
            <AmountPicker title="Length" value={snooze.minutes} min={1} max={60} unit={(n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`} onChange={(m) => set({ snooze: { ...snooze, minutes: m } })} />
            <AmountPicker title="How many times" value={snooze.limit} min={1} max={10} unit={(n) => `${n} ${n === 1 ? 'time' : 'times'}`} onChange={(limit) => set({ snooze: { ...snooze, limit } })} />
          </>
        ) : null}
        <Txt variant="caption">{"Snoozing for up to about 30 minutes didn't hurt sleep or mood in a 2023 study."}</Txt>
      </Sheet>

      <Sheet visible={sheet === 'check'} onClose={() => setSheet(null)} title="Wake up check">
        <ToggleRow title="Check that I'm awake" description="Asks a few minutes after you stop the alarm" value={awakeCheck.enabled} onChange={(enabled) => set({ awakeCheck: { ...awakeCheck, enabled } })} />
        {awakeCheck.enabled ? (
          <>
            <AmountPicker title="Ask after" value={awakeCheck.delayMinutes} min={1} max={30} unit={(n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`} onChange={(delayMinutes) => set({ awakeCheck: { ...awakeCheck, delayMinutes } })} />
            <AmountPicker title="Answer within" value={awakeCheck.answerMinutes} min={1} max={15} unit={(n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`} onChange={(answerMinutes) => set({ awakeCheck: { ...awakeCheck, answerMinutes } })} />
          </>
        ) : null}
        <Txt variant="caption">{"Stops you falling back asleep: if you don't answer, the alarm rings again."}</Txt>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const SKIP_DATE = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

const styles = StyleSheet.create({
  skipChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: space.md, height: 32, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, marginTop: -space.sm },
  skipChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  skipText: { fontSize: 13, fontFamily: FONT.regular, color: colors.text },
  skipTextOn: { color: colors.onAccent, fontFamily: FONT.medium },
  songBox: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  songPick: { paddingHorizontal: space.md, height: 32, borderRadius: radius.pill, backgroundColor: colors.accent, justifyContent: 'center' },
  songPickText: { fontSize: 14, fontFamily: FONT.medium, color: colors.onAccent },
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  headerSide: { width: 44, height: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: { fontSize: 20, lineHeight: 26, fontFamily: FONT.semibold, color: colors.text },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.sm, paddingVertical: space.lg },
  name: { flex: 1, minWidth: 0, fontSize: 19, fontFamily: FONT.regular, color: colors.text, paddingVertical: space.sm },
  ringIn: { fontSize: 19, lineHeight: 24, fontFamily: FONT.regular, color: colors.text, textAlign: 'center', marginTop: space.md, marginBottom: space.lg },
  days: { marginTop: space.xl, marginBottom: space.md },
  sectionLabel: { marginLeft: space.sm, marginTop: space.lg, marginBottom: -space.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.xl, paddingVertical: space.sm },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingTop: space.lg, paddingBottom: space.md },
  play: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  pressed: { opacity: 0.6 },
  soundPick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  soundName: { flex: 1, fontSize: 19, lineHeight: 24, fontFamily: FONT.regular, color: colors.text },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden', justifyContent: 'center', marginVertical: space.sm },
  progressFill: { height: '100%', width: '100%', backgroundColor: colors.text, transformOrigin: 'left' },
  progressDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 1, backgroundColor: colors.textMuted },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  delete: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.xl, minHeight: 44 },
  deleteText: { fontSize: 17, fontFamily: FONT.medium, color: colors.danger },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.bg },
  save: { height: 56, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 19, fontFamily: FONT.semibold, color: colors.onAccent },
  soundGroup: { marginTop: space.lg },
  groupText: { marginTop: space.xs },
  subhead: { marginBottom: space.xs },
  tabs: { flexDirection: 'row', gap: space.sm },
  tab: { flex: 1, flexDirection: 'row', gap: 6, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  tabOn: { backgroundColor: colors.accent },
  tabText: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  tabTextOn: { color: colors.onAccent },
  playSmallOn: { backgroundColor: colors.accent },
  vibeOption: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  soundOption: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60 },
  soundPickRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  optionTitle: { fontSize: 18, lineHeight: 24, fontFamily: FONT.regular, color: colors.text },
  optionTitleOn: { fontFamily: FONT.semibold },
  playSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
});
