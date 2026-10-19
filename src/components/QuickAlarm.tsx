import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { quickAlarm } from '@/core/defaults';
import { makeId } from '@/core/ring';
import { SOUNDS } from '@/core/sounds';
import { formatClockText } from '@/core/time';
import type { Alarm, AlarmSoundId } from '@/core/types';
import { usePreview } from '@/services/sound';
import { useNow } from '@/state/useNow';
import { FONT, colors, radius, space } from '@/theme';
import { AmountPicker } from './AmountPicker';
import { Sheet } from './Sheet';
import { Button, Chips, PressableScale, ToggleRow, Txt, haptic, type IconName } from './ui';

// Short naps (10–20 min) lift alertness without the grogginess of waking from
// deep sleep (Brooks & Lack, 2006); NASA's pilots got a 26-minute nap.
const PRESETS = [
  { minutes: 10, note: 'Best boost' },
  { minutes: 20, note: 'Power nap' },
  { minutes: 26, note: 'NASA nap' },
  { minutes: 45, note: '' },
  { minutes: 90, note: 'Full cycle' },
];
const NAP_SOUNDS: AlarmSoundId[] = ['gentle', 'birds', 'kalimba', 'buzzer', 'bell', 'continuous'];

/** What + on Alarms offers: a full alarm or a quick countdown. */
export function NewAlarmSheet({ visible, onClose, onAlarm, onQuick }: { visible: boolean; onClose: () => void; onAlarm: () => void; onQuick: () => void }) {
  const option = (icon: IconName, title: string, text: string, onPress: () => void) => (
    <PressableScale onPress={onPress} style={styles.option} accessibilityLabel={`${title}. ${text}`}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={24} color={colors.text} />
      </View>
      <View style={styles.flex}>
        <Txt variant="heading">{title}</Txt>
        <Txt variant="caption">{text}</Txt>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </PressableScale>
  );
  return (
    <Sheet visible={visible} onClose={onClose} title="New">
      {option('alarm-outline', 'Alarm', 'A wake-up time with repeat days, sounds and missions', onAlarm)}
      {option('timer-outline', 'Quick alarm', 'A countdown for a power nap. No missions, rings once', onQuick)}
    </Sheet>
  );
}

/** Pick a nap length and a sound, then start the countdown. */
export function QuickAlarmSheet({ visible, onClose, onStart, use24h }: { visible: boolean; onClose: () => void; onStart: (alarm: Alarm) => void; use24h: boolean }) {
  const [minutes, setMinutes] = useState(20);
  const [sound, setSound] = useState<AlarmSoundId>('gentle');
  const [vibrate, setVibrate] = useState(true);
  const preview = usePreview();
  const now = useNow(15_000);
  const at = new Date(now + minutes * 60_000);
  const close = () => {
    preview.stop();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Quick alarm"
      footer={
        <Button
          title={`Start · rings at ${formatClockText(at.getHours(), at.getMinutes(), use24h)}`}
          icon="timer-outline"
          onPress={() => {
            haptic('success');
            preview.stop();
            onStart(quickAlarm(makeId(), Date.now(), minutes, sound, SOUNDS[sound].mode, vibrate));
          }}
        />
      }
    >
      <View style={styles.presets}>
        {PRESETS.map((p) => {
          const on = p.minutes === minutes;
          return (
            <Pressable
              key={p.minutes}
              onPress={() => {
                if (!on) haptic('select');
                setMinutes(p.minutes);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.preset, on && styles.presetOn]}
            >
              <Text style={[styles.presetValue, on && styles.presetTextOn]}>{p.minutes}</Text>
              <Text style={[styles.presetNote, on && styles.presetTextOn]}>{p.note || 'min'}</Text>
            </Pressable>
          );
        })}
      </View>
      <AmountPicker value={minutes} min={1} max={180} unit={(n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`} onChange={setMinutes} />
      <Chips
        title="Sound (tap to hear it)"
        value={sound}
        onChange={(s) => {
          setSound(s);
          preview.play(s, 4, 1);
        }}
        options={NAP_SOUNDS.map((id) => ({ value: id, label: SOUNDS[id].title.replace(/ ·.*$/, '') }))}
      />
      <ToggleRow title="Vibrate" value={vibrate} onChange={setVibrate} />
      <Txt variant="caption">Naps of 10 to 20 minutes boost alertness without the grogginess of waking from deep sleep. Longer naps are best at about 90 minutes, one full sleep cycle.</Txt>
    </Sheet>
  );
}

/** A running nap on Alarms: time left, a bar, and Cancel. */
export function NapCountdown({ alarm, onCancel }: { alarm: Alarm; onCancel: () => void }) {
  const now = useNow(1000);
  const end = alarm.date ?? now;
  const left = Math.max(0, end - now);
  const total = Math.max(1, Number(alarm.label.match(/\d+/)?.[0] ?? 1) * 60_000);
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  return (
    <View style={styles.countdown} accessible accessibilityLabel={`Nap alarm in ${mm} minutes ${ss} seconds`}>
      <View style={styles.countdownTop}>
        <Ionicons name="timer-outline" size={20} color={colors.textMuted} />
        <Txt variant="caption" style={styles.flex}>{alarm.label}</Txt>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel nap alarm">
          <Txt variant="heading">Cancel</Txt>
        </Pressable>
      </View>
      <Text style={styles.countdownTime}>{`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, (left / total) * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md + 4, backgroundColor: colors.surfaceRaised },
  optionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  presets: { flexDirection: 'row', gap: space.sm },
  preset: { flex: 1, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', gap: 2 },
  presetOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  presetValue: { fontSize: 22, fontFamily: FONT.regular, color: colors.text },
  presetNote: { fontSize: 10, fontFamily: FONT.medium, color: colors.textMuted, textAlign: 'center' },
  presetTextOn: { color: colors.onAccent },
  countdown: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: space.sm, borderWidth: 1, borderColor: colors.borderStrong },
  countdownTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  countdownTime: { fontSize: 56, lineHeight: 62, fontFamily: FONT.thin, color: colors.text, fontVariant: ['tabular-nums'], textAlign: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.text },
});
