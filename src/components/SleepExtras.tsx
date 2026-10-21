import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RATINGS, SLEEP_SOUNDS, SLEEP_TAGS, SLEEP_TIMERS, formatDuration, minutesAsleep, type SleepDebt, type SleepTag, type TagEffect } from '@/core/sleep';
import type { SleepRecord } from '@/core/types';
import { setSleepSoundVolume, startSleepSound, stopSleepSound, useSleepSound } from '@/services/sound';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';
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
 * the last minute. Keeps playing when you leave the tab or lock the phone; an
 * alarm stops it.
 */
export function SleepSounds() {
  const { data, updateSettings } = useStore();
  const choice = data.settings.sleepSound;
  const playing = useSleepSound();
  const now = useNow(15_000);
  const on = playing.id !== null;
  const set = (patch: Partial<typeof choice>) => updateSettings({ sleepSound: { ...choice, ...patch } });
  const left = on && playing.minutes > 0 ? Math.max(0, playing.startedAt + playing.minutes * 60_000 - now) : null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="musical-notes-outline" size={22} color={colors.text} />
        <View style={styles.flex}>
          <Txt variant="heading">Sleep sounds</Txt>
          <Txt variant="caption">{on ? (left === null ? 'Playing all night' : `Fades out in ${formatDuration(left / 60_000)}`) : 'Steady sound masks the noises that wake you'}</Txt>
        </View>
      </View>
      <View style={styles.chips}>
        {SLEEP_SOUNDS.map((s) => (
          <Chip
            key={s.id}
            label={s.title}
            on={choice.id === s.id}
            onPress={() => {
              set({ id: s.id });
              if (on) startSleepSound(s.id, choice.minutes, choice.volume);
            }}
          />
        ))}
      </View>
      <Txt variant="label">Timer</Txt>
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
      <Button
        title={on ? 'Stop' : 'Play'}
        icon={on ? 'stop' : 'play'}
        variant={on ? 'secondary' : 'primary'}
        onPress={() => {
          haptic('light');
          if (on) stopSleepSound();
          else startSleepSound(choice.id, choice.minutes, choice.volume);
        }}
      />
    </View>
  );
}

/** Sleep owed over the last two weeks, and how to pay it back gently. */
export function DebtCard({ debt }: { debt: SleepDebt }) {
  if (debt.nights < 3) return null;
  const clear = debt.minutes < 30;
  // Paying back 30 minutes a night is gentle enough not to shift your body clock.
  const nights = Math.ceil(debt.minutes / 30);
  return (
    <View style={[styles.card, styles.row]}>
      <Ionicons name={clear ? 'checkmark-circle-outline' : 'hourglass-outline'} size={22} color={colors.text} />
      <View style={styles.flex}>
        <Txt variant="heading">{clear ? 'No sleep debt' : `Sleep debt: ${formatDuration(debt.minutes)}`}</Txt>
        <Txt variant="caption">
          {clear
            ? `Over the last ${debt.days} days you slept as much as your goal. Keep it steady.`
            : nights <= 14
              ? `Over the last ${debt.days} days. Going to bed 30 min earlier pays it back in about ${nights} ${nights === 1 ? 'night' : 'nights'}: steadier than one long lie-in, which doesn't undo a short week (Depner et al., 2019).`
              : `Over the last ${debt.days} days. Aim for 30 to 60 min more a night for the next two weeks; it's steadier than one long lie-in, which doesn't undo a short week (Depner et al., 2019).`}
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
        <Ionicons name="analytics-outline" size={22} color={colors.text} />
        <View style={styles.flex}>
          <Txt variant="heading">What affects your sleep</Txt>
          <Txt variant="caption">{effects.length ? 'Your nights with each one, compared with your nights without.' : `Tap a night below to note caffeine, alcohol, exercise, screens… After a few of each (${tagged} tagged so far), Ryz shows what helps you.`}</Txt>
        </View>
      </View>
      {effects.map((e) => {
        const better = e.minutes > 0;
        const small = Math.abs(e.minutes) < 10;
        return (
          <View key={e.tag} style={styles.effect}>
            <View style={styles.flex}>
              <Text style={styles.effectTitle}>{TAG_TITLE[e.tag]}</Text>
              <Txt variant="caption">{`${e.with} nights with, ${e.without} without${e.rating !== null ? ` · felt ${e.rating > 0 ? 'better' : e.rating < 0 ? 'worse' : 'the same'}` : ''}`}</Txt>
            </View>
            <Text style={[styles.effectValue, !small && !better && styles.worse]}>{small ? 'No change' : `${better ? '+' : '−'}${formatDuration(Math.abs(e.minutes))}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** A night's details: how rested you felt, what happened that day, and delete. */
export function NightSheet({ night, onClose, onRate, onTags, onDelete }: { night: SleepRecord | null; onClose: () => void; onRate: (r: SleepRecord['rating']) => void; onTags: (tags: SleepTag[]) => void; onDelete: () => void }) {
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
          <Button title="Delete this night" icon="trash-outline" variant="secondary" onPress={onDelete} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  card: { padding: space.lg, borderRadius: radius.md + 6, backgroundColor: colors.surface, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: 36, paddingHorizontal: space.md + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 14, fontFamily: FONT.regular, color: colors.text },
  chipTextOn: { color: colors.onAccent },
  effect: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  effectTitle: { fontSize: 16, fontFamily: FONT.regular, color: colors.text },
  effectValue: { fontSize: 16, fontFamily: FONT.medium, color: colors.text, fontVariant: ['tabular-nums'] },
  worse: { color: colors.danger },
  sheet: { gap: space.md, paddingBottom: space.md },
  why: { gap: space.xs },
});
