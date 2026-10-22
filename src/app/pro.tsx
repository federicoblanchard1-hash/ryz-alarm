import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt, haptic, type IconName } from '@/components/ui';
import { FEATURE_COPY, TRIAL_DAYS, proStatus, proThingsInUse, type ProFeature } from '@/core/pro';
import { SHOP, balance, cantRedeem, redeem, streakDays } from '@/core/xp';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

// Prices are placeholders until App Store / Google Play subscriptions are set up.
// The yearly plan is chosen by default and shown as a monthly price next to the
// monthly plan, with 6 months in between as a stepping stone that makes the
// year look like the obvious deal (anchoring and the decoy effect).
const PLANS = [
  { id: '12m', title: '1 year', price: 34.99, months: 12, best: true },
  { id: '6m', title: '6 months', price: 21.99, months: 6 },
  { id: '3m', title: '3 months', price: 12.99, months: 3 },
  { id: '1m', title: '1 month', price: 4.99, months: 1 },
  // "I'd pay a flat fee for an alarm, not $100 a year": the most repeated complaint in alarm-app reviews.
  { id: 'life', title: 'Lifetime', price: 59.99, months: 0 },
];
const MONTHLY = 4.99;
const money = (n: number) => `$${n.toFixed(2)}`;

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'flash-outline', text: 'All 14 missions, and up to 5 per alarm' },
  { icon: 'musical-notes-outline', text: 'All 39 sounds and every vibration pattern' },
  { icon: 'analytics-outline', text: 'Your whole sleep history: a year, any dates' },
  { icon: 'watch-outline', text: 'Automatic sleep from your smartwatch' },
  { icon: 'apps-outline', text: 'Every app icon: 3 styles and 12 for the seasons' },
  { icon: 'people-outline', text: 'Family Sharing: one plan for up to 6 people' },
];

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' });

function notice(title: string, text: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${text}`);
  else Alert.alert(title, text);
}

/** The paywall: what Pro adds, the plans, and the XP shop. Opened from a locked feature, it leads with that feature. */
export default function ProScreen() {
  const { feature } = useLocalSearchParams<{ feature?: ProFeature }>();
  const { data, update } = useStore();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const [plan, setPlan] = useState('12m');
  const status = proStatus(data, now);
  const coins = balance(data.xp);
  const offer = data.offer && data.offer.until > now ? data.offer : null;
  const copy = feature ? FEATURE_COPY[feature] : null;
  const using = feature === 'trial_ended' ? proThingsInUse(data) : [];
  const streak = streakDays(data, now);

  // The "trial ended" screen is shown once.
  useEffect(() => {
    if (feature === 'trial_ended') update((d) => (d.trialEndSeen ? d : { ...d, trialEndSeen: true }));
  }, [feature, update]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
          <Ionicons name="close" size={30} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={styles.wordmark}>Ryz Pro</Text>
        {copy ? (
          <View style={styles.lead}>
            <Text style={styles.title} accessibilityRole="header">{copy.title}</Text>
            <Txt variant="muted">{copy.text}</Txt>
            {using.length ? (
              <View style={styles.using}>
                <Txt variant="caption">What Pro was doing for you:</Txt>
                {using.map((u) => (
                  <View key={u} style={styles.perk}>
                    <Ionicons name="remove-circle-outline" size={18} color={colors.textMuted} />
                    <Txt variant="body" style={styles.flex}>{u}</Txt>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.status, status.kind !== 'free' && styles.statusOn]}>
          <Ionicons name={status.kind === 'free' ? 'diamond-outline' : 'diamond'} size={18} color={status.kind === 'free' ? colors.text : colors.onAccent} />
          <Text style={[styles.statusText, status.kind !== 'free' && styles.statusTextOn]}>
            {status.kind === 'pro'
              ? `Pro until ${DATE.format(status.until)}`
              : status.kind === 'trial'
                ? `Free trial · ${status.daysLeft} ${status.daysLeft === 1 ? 'day' : 'days'} left`
                : 'Free plan'}
          </Text>
        </View>

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p.text} style={styles.perk}>
              <Ionicons name={p.icon} size={20} color={colors.text} />
              <Txt variant="body" style={styles.flex}>{p.text}</Txt>
            </View>
          ))}
        </View>

        {status.kind === 'trial' ? (
          // An honest timeline: no surprise charges is what makes people comfortable starting.
          <View style={styles.timeline}>
            {[
              { icon: 'lock-open-outline' as IconName, when: 'Today', text: 'Everything in Pro is yours' },
              { icon: 'notifications-outline' as IconName, when: `${DATE.format(status.until - 3 * 864e5)}`, text: 'A reminder on your Morning screen, 3 days before the end' },
              { icon: 'leaf-outline' as IconName, when: DATE.format(status.until), text: 'Back to free. No card, nothing is charged' },
            ].map((s) => (
              <View key={s.when} style={styles.step}>
                <Ionicons name={s.icon} size={18} color={colors.text} />
                <View style={styles.flex}>
                  <Text style={styles.stepWhen}>{s.when}</Text>
                  <Txt variant="caption">{s.text}</Txt>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Txt variant="section" style={styles.section}>{status.kind === 'trial' ? 'Keep Pro after your trial' : 'Plans'}</Txt>
        {offer ? (
          <View style={styles.offer}>
            <Ionicons name="pricetag" size={18} color={colors.onAccent} />
            <Text style={styles.offerText}>{`Your ${offer.percent}% off the first year · until ${DATE.format(offer.until)}`}</Text>
          </View>
        ) : null}
        <View style={styles.plans} accessibilityRole="radiogroup">
          {PLANS.map((p) => {
            const on = plan === p.id;
            const discounted = offer && p.id === '12m' ? p.price * (1 - offer.percent / 100) : null;
            const perMonth = p.months ? (discounted ?? p.price) / p.months : 0;
            const save = p.months ? Math.round((1 - perMonth / MONTHLY) * 100) : 0;
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
                {p.best ? <Text style={[styles.badge, on && styles.badgeOn]}>{save > 0 ? `Best value · save ${save}%` : 'Best value'}</Text> : null}
                <View style={styles.flex}>
                  <Text style={[styles.planTitle, on && styles.textOn]}>{p.title}</Text>
                  <Text style={[styles.planNote, on && styles.noteOn]}>{p.months === 0 ? 'Pay once, Pro forever. No subscription' : p.months > 1 ? `${money(perMonth)} a month${!p.best && save > 0 ? ` · save ${save}%` : ''}` : 'Billed monthly'}</Text>
                </View>
                <View style={styles.prices}>
                  {discounted ? <Text style={[styles.was, on && styles.noteOn]}>{money(p.price)}</Text> : null}
                  <Text style={[styles.planPrice, on && styles.textOn]}>{money(discounted ?? p.price)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Button
          title={status.kind === 'trial' ? 'Keep Pro' : 'Continue'}
          onPress={() => notice('Payments aren’t on yet', 'Subscriptions start once Ryz is in the App Store and Google Play. Until then, you can earn Pro with XP below.')}
        />
        <Txt variant="caption" style={styles.center}>The price shown is the whole price. No ads on any plan, free included. Cancel anytime in your App Store or Google Play settings.</Txt>

        <Txt variant="section" style={styles.section}>XP shop</Txt>
        <Pressable onPress={() => router.push('/xp')} accessibilityRole="button" style={styles.coins}>
          <Ionicons name="star" size={20} color={colors.text} />
          <View style={styles.flex}>
            <Text style={styles.coinsText}>{`${coins.toLocaleString()} XP`}</Text>
            <Txt variant="caption">{`${streak}-day no-snooze streak · ${data.xp.freezes ?? 0} ${(data.xp.freezes ?? 0) === 1 ? 'freeze' : 'freezes'}`}</Txt>
          </View>
          <Txt variant="caption">How to earn</Txt>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
        <View style={styles.shop}>
          {SHOP.map((item, i) => {
            const why = cantRedeem(data, item, now);
            return (
              <View key={item.id} style={[styles.item, i > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <Txt variant="body">{item.title}</Txt>
                  <Txt variant="caption">{why ?? (item.kind === 'pro' ? 'One Pro pass a month' : item.text)}</Txt>
                </View>
                <Pressable
                  onPress={() => {
                    haptic('success');
                    update((d, t) => redeem(d, item, t));
                    notice('Done', item.kind === 'pro' ? `${item.title} added. Enjoy!` : item.kind === 'freeze' ? 'A streak freeze is ready for a morning you miss.' : `Your ${item.percent}% off is waiting on the yearly plan.`);
                  }}
                  disabled={Boolean(why)}
                  accessibilityRole="button"
                  accessibilityLabel={`Get ${item.title} for ${item.cost} XP`}
                  style={[styles.redeem, why && styles.redeemOff]}
                >
                  <Text style={[styles.redeemText, why && styles.redeemTextOff]}>{`${item.cost.toLocaleString()} XP`}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <Txt variant="caption">{`New accounts get ${TRIAL_DAYS} days of Pro free. XP passes can't be used during a trial or subscription, and XP never expires.`}</Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.lg, alignItems: 'flex-end' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: space.xl, gap: space.md },
  flex: { flex: 1, gap: 2 },
  center: { textAlign: 'center' },
  wordmark: { fontSize: 44, lineHeight: 50, fontFamily: FONT.displayItalic, color: colors.text },
  lead: { gap: space.sm },
  title: { fontSize: 30, lineHeight: 36, fontFamily: FONT.display, color: colors.text },
  using: { gap: space.sm, marginTop: space.sm, padding: space.lg, borderRadius: radius.md + 4, backgroundColor: colors.surface },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start', paddingHorizontal: space.md, height: 34, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  statusOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  statusText: { fontSize: 14, fontFamily: FONT.medium, color: colors.text },
  statusTextOn: { color: colors.onAccent },
  perks: { gap: space.md, paddingVertical: space.sm },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  timeline: { gap: space.md, padding: space.lg, borderRadius: radius.md + 4, borderWidth: 1, borderColor: colors.border },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepWhen: { fontSize: 15, fontFamily: FONT.semibold, color: colors.text },
  section: { marginTop: space.lg, marginLeft: space.xs },
  offer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.accent },
  offerText: { flex: 1, fontSize: 14, fontFamily: FONT.semibold, color: colors.onAccent },
  plans: { gap: space.sm },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md + 4, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  planOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  planTitle: { fontSize: 18, fontFamily: FONT.semibold, color: colors.text },
  planNote: { fontSize: 13, fontFamily: FONT.regular, color: colors.textMuted, marginTop: 2 },
  prices: { alignItems: 'flex-end' },
  was: { fontSize: 13, fontFamily: FONT.regular, color: colors.textMuted, textDecorationLine: 'line-through' },
  planPrice: { fontSize: 18, fontFamily: FONT.medium, color: colors.text },
  textOn: { color: colors.onAccent },
  noteOn: { color: '#3A3A3C' },
  badge: { position: 'absolute', top: -10, right: space.lg, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.text, color: colors.onAccent, fontSize: 11, fontFamily: FONT.semibold, overflow: 'hidden' },
  badgeOn: { backgroundColor: colors.bg, color: colors.text },
  coins: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg, borderRadius: radius.md + 4, backgroundColor: colors.surface },
  coinsText: { fontSize: 17, fontFamily: FONT.semibold, color: colors.text },
  shop: { borderRadius: radius.md + 4, backgroundColor: colors.surface, paddingHorizontal: space.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  redeem: { minWidth: 92, height: 36, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  redeemOff: { backgroundColor: colors.surfaceRaised },
  redeemText: { fontSize: 14, fontFamily: FONT.semibold, color: colors.onAccent },
  redeemTextOff: { color: colors.textFaint },
});
