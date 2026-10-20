import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt, haptic, type IconName } from '@/components/ui';
import { SHOP, balance, cantRedeem, proActive, redeem } from '@/core/xp';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

// Prices are placeholders until App Store / Google Play subscriptions are set up.
const PLANS = [
  { id: '1m', title: '1 month', price: '$4.99', note: '$4.99 a month' },
  { id: '3m', title: '3 months', price: '$12.99', note: '$4.33 a month · save 13%' },
  { id: '6m', title: '6 months', price: '$21.99', note: '$3.67 a month · save 27%' },
  { id: '12m', title: '1 year', price: '$34.99', note: '$2.92 a month · save 42%', best: true },
];

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'flash-outline', text: 'Every mission, sound and vibration' },
  { icon: 'alarm-outline', text: 'Unlimited alarms and power naps' },
  { icon: 'analytics-outline', text: 'Full sleep history, yearly stats and smartwatch sync' },
  { icon: 'newspaper-outline', text: 'All news topics and endless older news' },
  { icon: 'heart-outline', text: 'Support a small, independent app' },
];

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

function notice(title: string, text: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${text}`);
  else Alert.alert(title, text);
}

/** Ryz Pro: the paid plans, and the shop where XP buys free days of Pro. */
export default function ProScreen() {
  const { data, update } = useStore();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const [plan, setPlan] = useState('12m');
  const active = proActive(data, now);
  const coins = balance(data.xp);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
          <Ionicons name="close" size={30} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={styles.title} accessibilityRole="header">Ryz Pro</Text>
        <View style={[styles.status, active && styles.statusOn]}>
          <Ionicons name={active ? 'diamond' : 'diamond-outline'} size={20} color={active ? colors.onAccent : colors.text} />
          <Text style={[styles.statusText, active && styles.statusTextOn]}>{active && data.proUntil ? `Pro until ${DATE.format(data.proUntil)}` : 'You’re on the free plan'}</Text>
        </View>

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p.text} style={styles.perk}>
              <Ionicons name={p.icon} size={20} color={colors.text} />
              <Txt variant="body" style={styles.flex}>{p.text}</Txt>
            </View>
          ))}
          <Txt variant="caption">While Ryz is in beta, everything is free for everyone.</Txt>
        </View>

        <Txt variant="section" style={styles.section}>Plans</Txt>
        <View style={styles.plans} accessibilityRole="radiogroup">
          {PLANS.map((p) => {
            const on = plan === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  haptic('select');
                  setPlan(p.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.plan, on && styles.planOn]}
              >
                {p.best ? <Text style={[styles.badge, on && styles.badgeOn]}>Best value</Text> : null}
                <View style={styles.flex}>
                  <Text style={[styles.planTitle, on && styles.textOn]}>{p.title}</Text>
                  <Text style={[styles.planNote, on && styles.noteOn]}>{p.note}</Text>
                </View>
                <Text style={[styles.planPrice, on && styles.textOn]}>{p.price}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          title="Continue"
          onPress={() =>
            notice('Payments aren’t on yet', 'Subscriptions start once Ryz is in the App Store and Google Play. Until then, earn free Pro with XP below.')
          }
        />

        <Txt variant="section" style={styles.section}>Free Pro with XP</Txt>
        <Pressable onPress={() => router.push('/xp')} accessibilityRole="button" style={styles.coins}>
          <Ionicons name="star" size={20} color={colors.text} />
          <Text style={styles.coinsText}>{`${coins.toLocaleString()} XP to spend`}</Text>
          <Txt variant="caption">How to earn</Txt>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
        <View style={styles.shop}>
          {SHOP.map((item) => {
            const why = cantRedeem(data, item, now);
            return (
              <View key={item.days} style={styles.item}>
                <Text style={styles.itemDays}>{item.days === 30 || item.days === 7 ? '1' : item.days}</Text>
                <Text style={styles.itemUnit}>{item.days === 30 ? 'month' : item.days === 7 ? 'week' : 'days'}</Text>
                <Text style={styles.itemCost}>{`${item.cost.toLocaleString()} XP`}</Text>
                <Pressable
                  onPress={() => {
                    haptic('success');
                    update((d, t) => redeem(d, item, t));
                    notice('Enjoy Pro', `${item.title} added. Thanks for getting up on time!`);
                  }}
                  disabled={Boolean(why)}
                  accessibilityRole="button"
                  accessibilityLabel={`Get ${item.title} for ${item.cost} XP`}
                  style={[styles.redeem, why && styles.redeemOff]}
                >
                  <Text style={[styles.redeemText, why && styles.redeemTextOff]}>Get</Text>
                </Pressable>
                {why ? <Text style={styles.why}>{why}</Text> : null}
              </View>
            );
          })}
        </View>
        <Txt variant="caption">You can hold up to a month of free Pro at a time. XP never expires.</Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.lg, alignItems: 'flex-end' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: space.xl, gap: space.md },
  flex: { flex: 1 },
  title: { fontSize: 48, lineHeight: 54, fontFamily: FONT.displayItalic, color: colors.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start', paddingHorizontal: space.md, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  statusOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  statusText: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  statusTextOn: { color: colors.onAccent },
  perks: { gap: space.md, paddingVertical: space.md },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  section: { marginTop: space.lg, marginLeft: space.xs },
  plans: { gap: space.sm },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md + 4, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  planOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  planTitle: { fontSize: 18, fontFamily: FONT.semibold, color: colors.text },
  planNote: { fontSize: 13, fontFamily: FONT.regular, color: colors.textMuted, marginTop: 2 },
  planPrice: { fontSize: 18, fontFamily: FONT.medium, color: colors.text },
  textOn: { color: colors.onAccent },
  noteOn: { color: '#3A3A3C' },
  badge: { position: 'absolute', top: -10, right: space.lg, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.text, color: colors.onAccent, fontSize: 11, fontFamily: FONT.semibold, overflow: 'hidden' },
  badgeOn: { backgroundColor: colors.bg, color: colors.text },
  coins: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg, borderRadius: radius.md + 4, backgroundColor: colors.surface },
  coinsText: { flex: 1, fontSize: 17, fontFamily: FONT.semibold, color: colors.text },
  shop: { flexDirection: 'row', gap: space.sm },
  item: { flex: 1, alignItems: 'center', padding: space.md, borderRadius: radius.md + 4, backgroundColor: colors.surface, gap: 2 },
  itemDays: { fontSize: 36, lineHeight: 42, fontFamily: FONT.light, color: colors.text },
  itemUnit: { fontSize: 13, fontFamily: FONT.medium, color: colors.textMuted },
  itemCost: { fontSize: 14, fontFamily: FONT.semibold, color: colors.text, marginTop: space.sm },
  redeem: { marginTop: space.sm, alignSelf: 'stretch', height: 36, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  redeemOff: { backgroundColor: colors.surfaceRaised },
  redeemText: { fontSize: 15, fontFamily: FONT.semibold, color: colors.onAccent },
  redeemTextOff: { color: colors.textFaint },
  why: { fontSize: 11, fontFamily: FONT.regular, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
