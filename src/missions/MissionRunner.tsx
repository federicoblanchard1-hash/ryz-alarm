import Ionicons from '@expo/vector-icons/Ionicons';
import { Accelerometer, Barometer, Gyroscope, LightSensor, Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
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
import { BeepMission } from './BeepMission';
import { CountdownMission } from './CountdownMission';
import { DsstMission } from './DsstMission';
import { HuntMission } from './HuntMission';
import { NBackMission } from './NBackMission';
import { PairsMission } from './PairsMission';
import { SequenceMission } from './SequenceMission';
import { SlideMission } from './SlideMission';
import { SudokuMission } from './SudokuMission';
import { TappingMission } from './TappingMission';
import { TriviaMission } from './TriviaMission';
import { canLabelImages } from '@/services/vision';

const SCREENS: Record<Mission['type'], (props: MissionProps) => React.ReactElement> = {
  math: MathMission,
  memory: MemoryMission,
  typing: TypingMission,
  shake: BodyMission,
  squats: BodyMission,
  steps: BodyMission,
  jacks: BodyMission,
  sprint: BodyMission,
  twists: BodyMission,
  reach: BodyMission,
  light: BodyMission,
  numbers: NumbersMission,
  oddtile: OddTileMission,
  symbol: SymbolMission,
  unscramble: UnscrambleMission,
  qr: QrMission,
  pvt: ReactionMission,
  arrows: ArrowMission,
  slide: SlideMission,
  pairs: PairsMission,
  sequence: SequenceMission,
  sudoku: SudokuMission,
  trivia: TriviaMission,
  hunt: HuntMission,
  stairs: BodyMission,
  lunges: BodyMission,
  boxing: BodyMission,
  balance: BodyMission,
  countdown: CountdownMission,
  nback: NBackMission,
  dsst: DsstMission,
  tapping: TappingMission,
  beep: BeepMission,
};

/** Why a mission became sums, for the sensors where "can't count …" doesn't fit. */
const SWAP_REASON: Record<string, string> = {
  vision: 'Recognising photos needs the full Ryz app (not Expo Go or the web)',
  barometer: 'This phone has no barometer to feel the stairs',
};

/** Whether this phone can count the mission. Body missions need a motion sensor (and on web there isn't a usable one). */
async function canRun(mission: Mission): Promise<boolean> {
  const sensor = MISSIONS[mission.type].sensor;
  if (!sensor) return true;
  if (Platform.OS === 'web') return false;
  if (sensor === 'camera') return true;
  // Object hunt needs the on-device image recogniser, which isn't in Expo Go.
  if (sensor === 'vision') return canLabelImages();
  try {
    // The light sensor is Android-only; an iPhone gets the fallback mission.
    if (sensor === 'light') return Platform.OS === 'android' && (await LightSensor.isAvailableAsync());
    if (sensor === 'gyroscope') return await Gyroscope.isAvailableAsync();
    if (sensor === 'barometer') return await Barometer.isAvailableAsync();
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

/** After this long on one mission, a way out appears: the camera can't find the code, the steps won't count… */
const STUCK_MS = 2 * 60_000;

const COUNTDOWN = { from: { transform: [{ scaleX: 1 }] }, to: { transform: [{ scaleX: 0 }] } };

/** Runs the missions one after another. */
export function MissionRunner({ missions, onActivity, onComplete, timeLimitSeconds = 0, onTimeout }: Props) {
  const [index, setIndex] = useState(0);
  // Bumped when time runs out, which remounts the mission with a fresh puzzle.
  const [attempt, setAttempt] = useState(0);
  const [resolved, setResolved] = useState<{ index: number; mission: Mission; swapped: boolean; manual?: boolean } | null>(null);
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
  // Stuck for two minutes on a mission that isn't sums already? Offer to switch to sums, so a broken
  // sensor or a lost QR code never leaves you with an alarm you can't stop.
  const [stuck, setStuck] = useState<number | null>(null);
  useEffect(() => {
    if (!ready || current?.mission.type === FALLBACK_MISSION.type) return;
    const timer = setTimeout(() => setStuck(index), STUCK_MS);
    return () => clearTimeout(timer);
  }, [ready, index, current?.mission.type]);
  const switchToSums = () => {
    haptic('light');
    setStuck(null);
    setAttempt((a) => a + 1);
    setResolved({ index, mission: FALLBACK_MISSION, swapped: true, manual: true });
  };
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
          <Txt variant="caption">{current.manual ? 'Sums instead. Finish them to turn the alarm off.' : `${SWAP_REASON[MISSIONS[wanted.type].sensor ?? ''] ?? `This phone can't count ${MISSIONS[wanted.type].unit(2).replace(/^\d+ /, '')}`}, so here are some sums instead.`}</Txt>
        ) : null}
        {stuck === index && !current?.swapped ? (
          <Pressable onPress={switchToSums} hitSlop={8} accessibilityRole="button" style={styles.stuck}>
            <Ionicons name="help-circle-outline" size={16} color={colors.text} />
            <Txt variant="caption" style={styles.stuckText}>Stuck? Do sums instead</Txt>
          </Pressable>
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
  stuck: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: space.xs, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong },
  stuckText: { color: colors.text },
  timerFill: { height: '100%', width: '100%', backgroundColor: colors.text, transformOrigin: 'left' },
});
