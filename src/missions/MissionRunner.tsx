import Ionicons from '@expo/vector-icons/Ionicons';
import { Accelerometer, Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { haptic, Txt } from '@/components/ui';
import { FALLBACK_MISSION, MISSIONS, type Mission } from '@/core/missions';
import { colors, space } from '@/theme';
import { BodyMission } from './BodyMission';
import { MISSION_ICONS, type MissionProps } from './common';
import { MathMission } from './MathMission';
import { MemoryMission } from './MemoryMission';
import { TypingMission } from './TypingMission';
import { ArrowMission } from './ArrowMission';
import { NumbersMission } from './NumbersMission';
import { OddTileMission } from './OddTileMission';
import { QrMission } from './QrMission';
import { ReactionMission } from './ReactionMission';
import { SymbolMission } from './SymbolMission';
import { UnscrambleMission } from './UnscrambleMission';

const SCREENS: Record<Mission['type'], (props: MissionProps) => React.ReactElement> = {
  math: MathMission,
  memory: MemoryMission,
  typing: TypingMission,
  shake: BodyMission,
  squats: BodyMission,
  steps: BodyMission,
  jacks: BodyMission,
  numbers: NumbersMission,
  oddtile: OddTileMission,
  symbol: SymbolMission,
  unscramble: UnscrambleMission,
  qr: QrMission,
  pvt: ReactionMission,
  arrows: ArrowMission,
};

/** Whether this phone can count the mission. Body missions need a motion sensor (and on web there isn't a usable one). */
async function canRun(mission: Mission): Promise<boolean> {
  const sensor = MISSIONS[mission.type].sensor;
  if (!sensor) return true;
  if (Platform.OS === 'web') return false;
  if (sensor === 'camera') return true;
  try {
    return sensor === 'accelerometer' ? await Accelerometer.isAvailableAsync() : await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

interface Props {
  missions: Mission[];
  onActivity: () => void;
  onComplete: () => void;
  /** Seconds for each mission before it starts over; 0 for no limit. */
  timeLimitSeconds?: number;
  onTimeout?: () => void;
}

const COUNTDOWN = { from: { transform: [{ scaleX: 1 }] }, to: { transform: [{ scaleX: 0 }] } };

/** Runs the missions one after another. */
export function MissionRunner({ missions, onActivity, onComplete, timeLimitSeconds = 0, onTimeout }: Props) {
  const [index, setIndex] = useState(0);
  // Bumped when time runs out, which remounts the mission with a fresh puzzle.
  const [attempt, setAttempt] = useState(0);
  const [resolved, setResolved] = useState<{ index: number; mission: Mission; swapped: boolean } | null>(null);
  const wanted = missions[index];
  // Until the sensor check for this mission answers, show a spinner.
  const current = resolved?.index === index ? resolved : null;

  useEffect(() => {
    let cancelled = false;
    canRun(wanted).then((ok) => {
      if (!cancelled) setResolved(ok ? { index, mission: wanted, swapped: false } : { index, mission: FALLBACK_MISSION, swapped: true });
    });
    return () => {
      cancelled = true;
    };
  }, [wanted, index]);

  const ready = Boolean(current);
  useEffect(() => {
    if (!ready || timeLimitSeconds <= 0) return;
    const timer = setTimeout(() => {
      setAttempt((a) => a + 1);
      onTimeout?.();
    }, timeLimitSeconds * 1000);
    return () => clearTimeout(timer);
  }, [ready, index, attempt, timeLimitSeconds, onTimeout]);

  const done = () => {
    haptic('success');
    setAttempt(0);
    if (index + 1 < missions.length) setIndex(index + 1);
    else onComplete();
  };

  const Screen = current ? SCREENS[current.mission.type] : null;
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Txt variant="label">{missions.length > 1 ? `Mission ${index + 1} of ${missions.length}` : 'Mission'}</Txt>
        <View style={styles.titleRow}>
          <Ionicons name={MISSION_ICONS[(current?.mission ?? wanted).type]} size={26} color={colors.text} />
          <Txt variant="title">{MISSIONS[(current?.mission ?? wanted).type].title}</Txt>
        </View>
        {timeLimitSeconds > 0 && current ? (
          <View style={styles.timer} accessible accessibilityLabel={`${timeLimitSeconds} seconds for this mission`}>
            <Animated.View
              key={`${index}-${attempt}`}
              style={[styles.timerFill, { animationName: COUNTDOWN, animationDuration: `${timeLimitSeconds}s`, animationTimingFunction: 'linear', animationFillMode: 'forwards' }]}
            />
          </View>
        ) : null}
        {attempt > 0 ? <Txt variant="caption" accessibilityLiveRegion="polite">{"Out of time, so here's a fresh one."}</Txt> : null}
        {current?.swapped ? (
          <Txt variant="caption">{`This phone can't count ${MISSIONS[wanted.type].unit(2).replace(/^\d+ /, '')}, so here are some sums instead.`}</Txt>
        ) : null}
      </View>
      {current && Screen ? (
        <Screen key={`${index}-${attempt}`} mission={current.mission} onActivity={onActivity} onDone={done} />
      ) : (
        <ActivityIndicator color={colors.text} style={styles.loading} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.xl },
  header: { gap: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  loading: { flex: 1 },
  timer: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: space.sm },
  timerFill: { height: '100%', width: '100%', backgroundColor: colors.text, transformOrigin: 'left' },
});
