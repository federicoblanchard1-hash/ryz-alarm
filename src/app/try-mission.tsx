import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt } from '@/components/ui';
import { MISSIONS, type Mission, type MissionLevel, type MissionType } from '@/core/missions';
import { MissionRunner } from '@/missions/MissionRunner';
import { colors, space } from '@/theme';

/** Practise a mission from the editor, without an alarm ringing. */
export default function TryMission() {
  const params = useLocalSearchParams<{ type: string; amount: string; level: string; code?: string; objects?: string }>();
  const insets = useSafeAreaInsets();
  const [finished, setFinished] = useState(false);
  const type = (params.type in MISSIONS ? params.type : 'math') as MissionType;
  const [mission] = useState<Mission>(() => ({ type, amount: Number(params.amount) || MISSIONS[type].amounts[0], level: (Number(params.level) || 1) as MissionLevel, code: params.code || undefined, objects: params.objects ? params.objects.split(',') : undefined }));
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.inner, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.bar}>
          <Txt variant="caption">Practice: no alarm is ringing</Txt>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
        </View>
        {finished ? (
          <View style={styles.done}>
            <Ionicons name="checkmark-circle" size={72} color={colors.text} />
            <Txt variant="title">Done</Txt>
            <Txt variant="muted" style={styles.center}>{"That's what you'll do in the morning before the alarm turns off."}</Txt>
            <Button title="Back to the alarm" onPress={close} style={styles.back} />
          </View>
        ) : (
          <MissionRunner missions={[mission]} onActivity={() => {}} onComplete={() => setFinished(true)} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: space.xl, gap: space.xl },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  center: { textAlign: 'center' },
  back: { alignSelf: 'stretch', marginTop: space.lg },
});
