import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MoodId } from '@/core/mood';
import { nextRing } from '@/core/next';
import { RATINGS, SLEEP_SOUNDS, SLEEP_TAGS, SLEEP_TIMERS, formatDuration, minutesAsleep, type SleepDebt, type SleepTag, type TagEffect } from '@/core/sleep';
import { formatClockText } from '@/core/time';
import type { SleepRecord } from '@/core/types';
import { setSleepSoundVolume, startSleepSound, stopSleepSound, useSleepSound } from '@/services/sound';
import { useNow } from '@/state/useNow';
import { usePermissions } from '@/state/usePermissions';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';
import { MoodPicker } from './MoodPicker';
import { Sheet } from './Sheet';
import { Slider } from './Slider';
import { Button, Txt, haptic } from './ui';

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic('select');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Rain, waves or noise to fall asleep to, with a timer that fades out over
 * the last minute. One small row with a play button; the choices fold out.
 * Keeps playing when you leave the tab or lock the phone; an alarm stops it.
 */
export function SleepSounds() {
  const { data, updateSettings } = useStore();
  const choice = data.settings.sleepSound;
  const playing = useSleepSound();
  const now = useNow(15_000);
  const [open, setOpen] = useState(false);
  const on = playing.id !== null;
  const set = (patch: Partial<typeof choice>) => updateSettings({ sleepSound: { ...choice, ...patch } });
  const left = on && playing.minutes > 0 ? Math.max(0, playing.startedAt + playing.minutes * 60_000 - now) : null;
  const title = SLEEP_SOUNDS.find((x) => x.id === choice.id)?.title ?? 'Sleep sound';
  const timer = choice.minutes === 0 ? 'all night' : `${choice.minutes} min`;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Pressable
          onPress={() => {
            haptic('light');
            if (on) stopSleepSound();
            else startSleepSound(choice.id, choice.minutes, choice.volume);
          }}
          accessibilityRole="button"
          accessibilityLabel={on ? 'Stop sleep sound' : `Play ${title}`}
          style={[styles.play, on && styles.playOn]}
        >
          <Ionicons name={on ? 'pause' : 'play'} size={18} color={on ? colors.onAccent : colors.text} />
        </Pressable>
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel="Sleep sound options" accessibilityState={{ expanded: open }} style={styles.flexRow}>
          <View style={styles.flex}>
            <Text style={styles.small}>{title}</Text>
            <Txt variant="caption">{on ? (left === null ? 'Playing all night' : `Fades out in ${formatDuration(left / 60_000)}`) : `Sleep sound · ${timer}`}</Txt>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textFaint} />
        </Pressable>
      </View>
      {open ? (
        <>
          <View style={styles.chips}>
            {SLEEP_SOUNDS.map((x) => (
              <Chip
                key={x.id}
                label={x.title}
                on={choice.id === x.id}
                onPress={() => {
                  set({ id: x.id });
                  if (on) startSleepSound(x.id, choice.minutes, choice.volume);
                }}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {SLEEP_TIMERS.map((m) => (
              <Chip key={m} label={m === 0 ? 'All night' : `${m} min`} on={choice.minutes === m} onPress={() => set({ minutes: m })} />
            ))}
          </View>
          <Slider
            label="Sleep sound volume"
            value={choice.volume}
            min={0.05}
            onSlide={(v) => on && setSleepSoundVolume(v)}
            onChange={(volume) => {
              set({ volume });
              if (on) setSleepSoundVolume(volume);
            }}
          />
        </>
      ) : null}
    </View>
  );
}

/** Sleep owed over the last two weeks, and how to pay it back gently. */
export function DebtCard({ debt }: { debt: SleepDebt }) {
  if (debt.nights < 3) return null;
  const clear = debt.minutes < 30;
  // 30 minutes a night pays it back without shifting your body clock; one long lie-in doesn't undo a short week (Depner et al., 2019).
  const nights = Math.ceil(debt.minutes / 30);
  return (
    <View style={[styles.card, styles.head]}>
      <Ionicons name={clear ? 'checkmark-circle-outline' : 'hourglass-outline'} size={20} color={colors.text} />
      <View style={styles.flex}>
        <Text style={styles.small}>{clear ? 'No sleep debt' : `Sleep debt · ${formatDuration(debt.minutes)}`}</Text>
        <Txt variant="caption">
          {clear ? `On goal for the last ${debt.days} days` : nights <= 14 ? `Bed 30 min earlier for ${nights} ${nights === 1 ? 'night' : 'nights'}` : 'Bed 30–60 min earlier for two weeks'}
        </Txt>
      </View>
    </View>
  );
}

const TAG_TITLE = Object.fromEntries(SLEEP_TAGS.map((t) => [t.id, t.title])) as Record<SleepTag, string>;

/** What goes with better or worse sleep for you, from the nights you've tagged. */
export function TagEffects({ effects, tagged }: { effects: TagEffect[]; tagged: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="analytics-outline" size={20} color={colors.text} />
        <View style={styles.flex}>
          <Text style={styles.small}>What affects your sleep</Text>
          <Txt variant="caption">{effects.length ? 'Your nights with it vs without' : `Tap a night to tag coffee, screens… (${tagged} so far)`}</Txt>
        </View>
      </View>
      {effects.map((e) => {
        const better = e.minutes > 0;
        const small = Math.abs(e.minutes) < 10;
        return (
          <View key={e.tag} style={styles.effect}>
            <Text style={[styles.effectTitle, styles.flex]}>{TAG_TITLE[e.tag]}</Text>
            <Text style={[styles.effectValue, !small && !better && styles.worse]}>{small ? 'Same' : `${better ? '+' : '−'}${formatDuration(Math.abs(e.minutes))}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Before Start sleep: how your day was (for the Mood calendar), and a quick
 * look at whether tomorrow's alarm will ring, so you can sleep without
 * wondering.
 */
export function BedtimeSheet({ visible, onClose, onStart }: { visible: boolean; onClose: () => void; onStart: (mood: MoodId | null) => void }) {
  const { data } = useStore();
  const now = useNow(60_000);
  const permissions = usePermissions();
  const [mood, setMood] = useState<MoodId | null>(null);
  const next = nextRing(data, now);
  const soon = next && next.at - now < 24 * 60 * 60_000 ? next : null;
  const ringsClosed = !permissions.supported || permissions.state?.notifications === 'granted';
  const at = soon ? new Date(soon.at) : null;
  const checks: { ok: boolean; text: string; fix?: () => void; fixLabel?: string }[] = [
    {
      ok: Boolean(soon),
      text: at ? `Alarm at ${formatClockText(at.getHours(), at.getMinutes(), data.settings.use24h)}` : 'No alarm for tomorrow',
      fix: soon ? undefined : () => {
        onClose();
        router.push({ pathname: '/alarm/[id]', params: { id: 'new' } });
      },
      fixLabel: 'Set one',
    },
    { ok: ringsClosed, text: ringsClosed ? 'Notifications on: it rings even if Ryz is closed' : 'Notifications off: keep Ryz open tonight', fix: ringsClosed ? undefined : permissions.fix, fixLabel: 'Fix' },
  ];
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Before you sleep"
      footer={
        <Button
          title="Start sleep"
          icon="bed-outline"
          onPress={() => {
            onStart(mood);
            setMood(null);
          }}
        />
      }
    >
      <Txt variant="label">How was your day?</Txt>
      <MoodPicker label="Your mood tonight" value={mood} onPick={setMood} />
      <Txt variant="label">Tomorrow</Txt>
      {checks.map((c) => (
        <View key={c.text} style={styles.check}>
          <Ionicons name={c.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={c.ok ? colors.text : colors.danger} />
          <Txt variant="body" style={styles.flex}>{c.text}</Txt>
          {c.fix ? (
            <Pressable onPress={c.fix} hitSlop={8} accessibilityRole="button">
              <Text style={styles.fix}>{c.fixLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {Platform.OS === 'ios' && soon ? <Txt variant="caption">On iPhone, keep the ring/silent switch on, or leave Ryz open, so the alarm makes sound.</Txt> : null}
    </Sheet>
  );
}

/** A night's details: how rested you felt, what happened that day, and delete. */
export function NightSheet({ night, onClose, onRate, onTags, onDelete, onEdit }: { night: SleepRecord | null; onClose: () => void; onRate: (r: SleepRecord['rating']) => void; onTags: (tags: SleepTag[]) => void; onDelete: () => void; onEdit: () => void }) {
  const tags = night?.tags ?? [];
  return (
    <Sheet visible={night !== null} onClose={onClose} title={night ? `${formatDuration(minutesAsleep(night))} · ${new Date(night.end).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}>
      {night ? (
        <View style={styles.sheet}>
          <Txt variant="label">How did you feel?</Txt>
          <View style={styles.chips}>
            {RATINGS.map((r) => (
              <Chip key={r.value} label={r.label} on={night.rating === r.value} onPress={() => onRate(night.rating === r.value ? undefined : r.value)} />
            ))}
          </View>
          <Txt variant="label">The day before</Txt>
          <View style={styles.chips}>
            {SLEEP_TAGS.map((t) => (
              <Chip key={t.id} label={t.title} on={tags.includes(t.id)} onPress={() => onTags(tags.includes(t.id) ? tags.filter((x) => x !== t.id) : [...tags, t.id])} />
            ))}
          </View>
          {tags.length ? (
            <View style={styles.why}>
              {SLEEP_TAGS.filter((t) => tags.includes(t.id)).map((t) => (
                <Txt key={t.id} variant="caption">{`${t.title}: ${t.why}`}</Txt>
              ))}
            </View>
          ) : null}
          <Button title="Edit times" icon="time-outline" variant="secondary" onPress={onEdit} />
          <Button title="Delete this night" icon="trash-outline" variant="secondary" onPress={onDelete} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  flexRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  card: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  small: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  play: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  playOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: 32, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, fontFamily: FONT.regular, color: colors.text },
  chipTextOn: { color: colors.onAccent },
  effect: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  effectTitle: { fontSize: 14, fontFamily: FONT.regular, color: colors.text },
  effectValue: { fontSize: 14, fontFamily: FONT.medium, color: colors.text, fontVariant: ['tabular-nums'] },
  worse: { color: colors.danger },
  sheet: { gap: space.md, paddingBottom: space.md },
  why: { gap: space.xs },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fix: { fontSize: 14, fontFamily: FONT.medium, color: colors.text, textDecorationLine: 'underline' },
});
