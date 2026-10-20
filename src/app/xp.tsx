import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt } from '@/components/ui';
import { XP_RULES, balance, levelOf, type XpReason } from '@/core/xp';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

const TITLES: Record<XpReason, string> = { ...Object.fromEntries(XP_RULES.map((r) => [r.reason, r.title])), redeem: 'Spent in the shop' } as Record<XpReason, string>;
const WHEN = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** Your XP: level, what you can spend, how to earn more, and what you earned lately. */
export default function XpScreen() {
  const { data } = useStore();
  const insets = useSafeAreaInsets();
  const { level, into, needed } = levelOf(data.xp.earned);
  const coins = balance(data.xp);
  const recent = [...data.xp.events].reverse().slice(0, 25);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
          <Ionicons name="close" size={30} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Txt variant="label">{`Level ${level}`}</Txt>
        <Text style={styles.balance} accessibilityRole="header">{`${coins.toLocaleString()} XP`}</Text>
        <Txt variant="muted">{`${data.xp.earned.toLocaleString()} earned in all · ${needed - into} XP to level ${level + 1}`}</Txt>
        <View style={styles.track} accessible accessibilityLabel={`${Math.round((into / needed) * 100)}% of the way to level ${level + 1}`}>
          <View style={[styles.fill, { width: `${(into / needed) * 100}%` }]} />
        </View>
        <Button title="Spend XP on free Pro" icon="diamond-outline" onPress={() => router.push('/pro')} style={styles.spend} />

        <Txt variant="section" style={styles.section}>How to earn XP</Txt>
        <View style={styles.card}>
          {XP_RULES.map((r, i) => (
            <View key={r.reason} style={[styles.rule, i > 0 && styles.divider]}>
              <View style={styles.flex}>
                <Txt variant="body">{r.title}</Txt>
                <Txt variant="caption">{r.text}</Txt>
              </View>
              <Text style={styles.amount}>{`+${r.amount}`}</Text>
            </View>
          ))}
        </View>

        <Txt variant="section" style={styles.section}>Recent</Txt>
        <View style={styles.card}>
          {recent.length === 0 ? (
            <Txt variant="muted" style={styles.empty}>Nothing yet. Stop your next alarm without snoozing to earn your first XP.</Txt>
          ) : (
            recent.map((e, i) => (
              <View key={e.id} style={[styles.rule, i > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <Txt variant="body">{TITLES[e.reason]}</Txt>
                  <Txt variant="caption">{WHEN.format(e.at)}</Txt>
                </View>
                <Text style={[styles.amount, e.amount < 0 && styles.spent]}>{e.amount > 0 ? `+${e.amount}` : `${e.amount}`}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.lg, alignItems: 'flex-end' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: space.xl, gap: space.sm },
  balance: { fontSize: 56, lineHeight: 64, fontFamily: FONT.light, color: colors.text, letterSpacing: -1 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: space.sm },
  fill: { height: '100%', backgroundColor: colors.text, borderRadius: 4 },
  spend: { marginTop: space.lg },
  section: { marginTop: space.xl, marginLeft: space.xs },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: space.lg },
  rule: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  flex: { flex: 1, gap: 2 },
  amount: { fontSize: 17, fontFamily: FONT.semibold, color: colors.text, fontVariant: ['tabular-nums'] },
  spent: { color: colors.textMuted },
  empty: { paddingVertical: space.lg },
});
