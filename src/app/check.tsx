import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt, haptic } from '@/components/ui';
import { confirmAwake, findActive } from '@/core/ring';
import { addXp, awakeCheckXp } from '@/core/xp';
import { formatClockText } from '@/core/time';
import { clearDelivered } from '@/services/notifications';
import { useScreenAwake } from '@/state/useScreenAwake';
import { useStore } from '@/state/store';
import { FONT, colors, space } from '@/theme';

export default function AwakeCheck() {
  const { data, update } = useStore();
  const insets = useSafeAreaInsets();
  const [active] = useState(() => {
    const a = findActive(data, Date.now());
    return a?.type === 'check' ? a : null;
  });
  useScreenAwake('ryz-check');

  useEffect(() => {
    if (!active) router.replace('/');
    else clearDelivered();
  }, [active]);

  if (!active) return <View style={styles.screen} />;

  const recheck = data.pending.find((e) => e.kind === 'recheck' && e.alarmId === active.alarmId);
  const recheckAt = recheck ? new Date(recheck.at) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xxl * 2, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.top}>
        <Txt style={styles.question} accessibilityRole="header">Are you awake?</Txt>
        {recheckAt ? (
          <Txt variant="muted" style={styles.center}>
            {`If you don't answer, the alarm rings again at ${formatClockText(recheckAt.getHours(), recheckAt.getMinutes(), data.settings.use24h)}.`}
          </Txt>
        ) : null}
      </View>
      <Button
        title="I'm awake"
        icon="checkmark"
        style={styles.button}
        onPress={() => {
          haptic('success');
          update((d, t) => addXp(confirmAwake(d, active.alarmId), [awakeCheckXp(active.alarmId, t)]));
          clearDelivered();
          router.replace('/');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  top: { gap: space.md, alignItems: 'center' },
  question: { fontSize: 40, lineHeight: 48, fontFamily: FONT.semibold, color: colors.text, textAlign: 'center', letterSpacing: -1 },
  center: { textAlign: 'center' },
  button: { height: 64 },
});
