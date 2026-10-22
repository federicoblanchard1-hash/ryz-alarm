import Ionicons from '@expo/vector-icons/Ionicons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { PVT_FALSE_START_MS, pvtDelay } from '@/core/missions';
import { BEEP_LIMIT_MS } from '@/core/puzzles';
import { FONT, colors, space } from '@/theme';
import { Progress, type MissionProps } from './common';

type Phase = { kind: 'waiting' } | { kind: 'beeped'; at: number } | { kind: 'result'; text: string; good: boolean };

/**
 * Sound reaction, the auditory version of the reaction test: the screen stays
 * dark, a beep comes after a random wait, and you tap as soon as you hear it.
 */
export function BeepMission({ mission, onActivity, onDone }: MissionProps) {
  const player = useAudioPlayer(require('../../assets/sounds/beep.wav'));
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'waiting' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = BEEP_LIMIT_MS[mission.level];

  const beep = () => {
    player.seekTo(0);
    player.play();
    setPhase({ kind: 'beeped', at: Date.now() });
  };
  const beepLater = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase({ kind: 'waiting' });
    timer.current = setTimeout(beep, pvtDelay());
  };

  // The first round starts in 'waiting', so only the beep needs scheduling.
  useEffect(() => {
    // Heard even with the ringer switch on silent, like the alarm itself.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
    timer.current = setTimeout(() => {
      player.seekTo(0);
      player.play();
      setPhase({ kind: 'beeped', at: Date.now() });
    }, pvtDelay());
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [player]);

  const tap = () => {
    onActivity();
    if (phase.kind === 'result') return;
    if (phase.kind === 'waiting') {
      haptic('error');
      if (timer.current) clearTimeout(timer.current);
      setPhase({ kind: 'result', text: 'Too early. Wait for the beep.', good: false });
      timer.current = setTimeout(beepLater, 1200);
      return;
    }
    const ms = Date.now() - phase.at;
    const ok = ms >= PVT_FALSE_START_MS && ms <= limit;
    haptic(ok ? 'light' : 'error');
    if (ok && count + 1 >= mission.amount) {
      onDone();
      return;
    }
    if (ok) setCount(count + 1);
    setPhase({ kind: 'result', text: ok ? `${ms} ms` : ms < PVT_FALSE_START_MS ? 'Too early.' : `${ms} ms. Too slow, under ${limit} ms counts.`, good: ok });
    timer.current = setTimeout(beepLater, 900);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={count / mission.amount} />
        <Txt variant="caption">{`${count} of ${mission.amount}`}</Txt>
      </View>
      <Pressable onPressIn={tap} accessibilityRole="button" accessibilityLabel="Tap when you hear the beep" style={styles.pad}>
        {phase.kind === 'result' ? (
          <Text style={[styles.result, !phase.good && styles.bad]}>{phase.text}</Text>
        ) : (
          <>
            <Ionicons name="ear-outline" size={48} color={colors.textFaint} />
            <Text style={styles.label}>Listen…</Text>
          </>
        )}
      </Pressable>
      <Txt variant="caption" style={styles.center}>Turn the volume up. Tap anywhere the moment you hear the beep.</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.lg },
  top: { gap: space.sm },
  pad: { flex: 1, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  label: { fontSize: 22, fontFamily: FONT.light, color: colors.textMuted, textAlign: 'center' },
  result: { fontSize: 30, lineHeight: 38, fontFamily: FONT.regular, color: colors.text, textAlign: 'center' },
  bad: { color: colors.textMuted, fontSize: 22, lineHeight: 30 },
  center: { textAlign: 'center' },
});
