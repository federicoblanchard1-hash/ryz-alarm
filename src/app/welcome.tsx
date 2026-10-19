import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt, type IconName } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { FONT, colors, space } from '@/theme';

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'alarm-outline', text: 'Alarms you can’t sleep through, with sounds chosen from sleep research' },
  { icon: 'flash-outline', text: 'Missions that wake up your brain and body before the alarm stops' },
  { icon: 'analytics-outline', text: 'Sleep tracking, a power-nap timer, the weather and your news' },
];

/** First launch: what Ryz is, then create an account or log in. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { enabled } = useAuth();
  const enter = (i: number) => (reduced ? undefined : FadeInDown.delay(150 + i * 120).duration(420));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.top}>
        <Animated.Text entering={enter(0)} style={styles.wordmark} accessibilityRole="header">ryz</Animated.Text>
        <Animated.View entering={enter(1)}>
          <Text style={styles.headline}>Wake up for real.</Text>
        </Animated.View>
        <View style={styles.points}>
          {POINTS.map((p, i) => (
            <Animated.View key={p.icon} entering={enter(i + 2)} style={styles.point}>
              <Ionicons name={p.icon} size={22} color={colors.text} />
              <Txt variant="muted" style={styles.flex}>{p.text}</Txt>
            </Animated.View>
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        {enabled ? (
          <>
            <Button title="Create an account" onPress={() => router.push({ pathname: '/account', params: { mode: 'signup', onboarding: '1' } })} />
            <Button title="I already have an account" variant="secondary" onPress={() => router.push({ pathname: '/account', params: { mode: 'login', onboarding: '1' } })} />
          </>
        ) : (
          <Button title="Get started" onPress={() => router.replace({ pathname: '/interests', params: { first: '1' } })} />
        )}
        <Txt variant="caption" style={styles.center}>Your alarms always work, even offline. The account keeps your profile, news and goals.</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  top: { gap: space.lg },
  wordmark: { fontSize: 88, lineHeight: 96, fontFamily: FONT.displayItalic, color: colors.text, letterSpacing: 1 },
  headline: { fontSize: 40, lineHeight: 46, fontFamily: FONT.display, color: colors.text },
  points: { gap: space.lg, marginTop: space.lg },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  actions: { gap: space.md },
  center: { textAlign: 'center' },
});
