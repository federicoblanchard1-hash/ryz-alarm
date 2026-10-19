import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt, haptic, type IconName } from '@/components/ui';
import { GOALS } from '@/core/goals';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

/** The last onboarding step (also reachable from Settings): what you want to improve. */
export default function Goals() {
  const { first } = useLocalSearchParams<{ first?: string }>();
  const { data, updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState(() => new Set(data.settings.goals));
  const [other, setOther] = useState(data.settings.goalOther);
  const otherOn = picked.has('other');

  const toggle = (id: string) => {
    haptic('select');
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = () => {
    haptic('success');
    const goals = GOALS.map((g) => g.id).filter((id) => picked.has(id));
    updateSettings({ goals, goalOther: otherOn ? other.trim() : '', onboarded: true });
    if (first && router.canDismiss()) router.dismissAll();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        {first ? <Txt variant="label">Last step</Txt> : null}
        <Text style={styles.title} accessibilityRole="header">What do you want to improve?</Text>
        <Txt variant="muted">Pick as many as you like. Ryz uses them to suggest settings and tips.</Txt>
        <View style={styles.grid}>
          {GOALS.map((g) => {
            const on = picked.has(g.id);
            return (
              <Pressable key={g.id} onPress={() => toggle(g.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={({ pressed }) => [styles.goal, on && styles.goalOn, pressed && styles.pressed]}>
                <Ionicons name={g.icon as IconName} size={22} color={on ? colors.onAccent : colors.text} />
                <Text style={[styles.goalText, on && styles.goalTextOn]}>{g.title}</Text>
              </Pressable>
            );
          })}
        </View>
        {otherOn ? (
          <TextInput
            value={other}
            onChangeText={setOther}
            placeholder="Tell us what you'd like to improve"
            placeholderTextColor={colors.textFaint}
            style={styles.otherInput}
            multiline
            maxLength={300}
            autoFocus
            accessibilityLabel="Something else you want to improve"
          />
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button title={picked.size === 0 ? 'Skip for now' : 'Done'} onPress={finish} variant={picked.size === 0 ? 'secondary' : 'primary'} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, gap: space.md },
  title: { fontSize: 40, lineHeight: 46, fontFamily: FONT.display, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  goal: { flexBasis: '48%', flexGrow: 1, minHeight: 92, padding: space.md, borderRadius: radius.md + 4, backgroundColor: colors.surface, gap: space.sm, justifyContent: 'space-between' },
  goalOn: { backgroundColor: colors.accent },
  pressed: { opacity: 0.8 },
  goalText: { fontSize: 15, lineHeight: 20, fontFamily: FONT.medium, color: colors.text },
  goalTextOn: { color: colors.onAccent },
  otherInput: { minHeight: 96, borderRadius: radius.md, backgroundColor: colors.surface, padding: space.lg, fontSize: 16, fontFamily: FONT.regular, color: colors.text, textAlignVertical: 'top' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.bg },
});
