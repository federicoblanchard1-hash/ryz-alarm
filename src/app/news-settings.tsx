import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinkRow, Section, ToggleRow, Txt, haptic } from '@/components/ui';
import { COUNTRIES, REGIONS, countryByCode, type RegionId } from '@/core/countries';
import { entityTitle, type NewsPrefs } from '@/core/newsPrefs';
import { EDITIONS } from '@/core/sources';
import { registrySources } from '@/core/stories';
import { pathTitle } from '@/core/taxonomy';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

function Chip({ label, on, onPress, danger }: { label: string; on: boolean; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        haptic('select');
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={[styles.chip, on && (danger ? styles.chipDanger : styles.chipOn)]}
    >
      <Text style={[styles.chipText, on && !danger && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/** Languages, where you live, regions, sources, paywalls and mutes: every filter on the news. */
export default function NewsSettings() {
  const { data, updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const news = data.settings.news;
  const set = (patch: Partial<NewsPrefs>) => updateSettings({ news: { ...news, ...patch } });
  const [countryQuery, setCountryQuery] = useState('');
  const [pickCountry, setPickCountry] = useState(false);
  const [sourceQuery, setSourceQuery] = useState('');
  const [word, setWord] = useState('');
  const sources = useMemo(() => registrySources(), []);
  const sq = sourceQuery.trim().toLowerCase();
  const chosenSources = sources.filter((s) => news.preferredSources.includes(s.id) || news.blockedSources.includes(s.id));
  const shownSources = sq ? sources.filter((s) => s.name.toLowerCase().includes(sq) || s.site.includes(sq)).slice(0, 40) : chosenSources;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const addWord = () => {
    const w = word.trim();
    if (w && !news.mutedKeywords.includes(w)) set({ mutedKeywords: [...news.mutedKeywords, w] });
    setWord('');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.md }]}>
      <View style={styles.top}>
        <Text style={styles.title} accessibilityRole="header">
          News settings
        </Text>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={30} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <Section label="Following" footer="Topics at any level, and names: teams, players, leagues, companies, tickers, people, countries, cities and keywords.">
          <LinkRow title="Topics" value={`${data.settings.newsTopics?.length ?? 0}`} onPress={() => router.push('/interests')} />
          <LinkRow title="Teams, people & more" value={news.entities.length ? news.entities.map(entityTitle).slice(0, 3).join(', ') : 'None'} onPress={() => router.push({ pathname: '/interests', params: { tab: 'names' } })} />
        </Section>

        <View style={styles.block}>
          <Txt variant="label">Languages and editions</Txt>
          <Txt variant="caption">Stories come in these languages, from these countries’ editions. The first one you pick is your main edition.</Txt>
          <View style={styles.chips}>
            {EDITIONS.map((e) => {
              const i = news.editions.indexOf(e.id);
              return <Chip key={e.id} label={i === 0 ? `${e.label} · main` : e.label} on={i >= 0} onPress={() => set({ editions: i >= 0 ? (news.editions.length > 1 ? news.editions.filter((x) => x !== e.id) : news.editions) : [...news.editions, e.id] })} />;
            })}
          </View>
        </View>

        <View style={styles.block}>
          <Txt variant="label">Where you live</Txt>
          <Txt variant="caption">For Local & National: news, weather alerts, traffic, events and jobs near you.</Txt>
          <Pressable onPress={() => setPickCountry((v) => !v)} style={styles.field} accessibilityRole="button" accessibilityLabel="Country">
            <Text style={styles.fieldLabel}>Country</Text>
            <Text style={styles.fieldValue}>{countryByCode(news.country)?.name ?? 'Pick one'}</Text>
          </Pressable>
          {pickCountry ? (
            <>
              <TextInput value={countryQuery} onChangeText={setCountryQuery} placeholder="Search countries" placeholderTextColor={colors.textFaint} style={styles.input} autoCorrect={false} />
              <View style={styles.chips}>
                {COUNTRIES.filter((c) => !countryQuery.trim() || c.name.toLowerCase().includes(countryQuery.trim().toLowerCase()))
                  .slice(0, 60)
                  .map((c) => (
                    <Chip
                      key={c.code}
                      label={c.name}
                      on={news.country === c.code}
                      onPress={() => {
                        set({ country: c.code });
                        setPickCountry(false);
                      }}
                    />
                  ))}
              </View>
            </>
          ) : null}
          <TextInput value={news.region} onChangeText={(region) => set({ region })} placeholder="State, province or region" placeholderTextColor={colors.textFaint} style={styles.input} accessibilityLabel="Region" />
          <TextInput value={news.city} onChangeText={(city) => set({ city })} placeholder="City" placeholderTextColor={colors.textFaint} style={styles.input} accessibilityLabel="City" />
        </View>

        <View style={styles.block}>
          <Txt variant="label">Only from these regions</Txt>
          <Txt variant="caption">Leave all off to read news from everywhere.</Txt>
          <View style={styles.chips}>
            {REGIONS.map((r) => (
              <Chip key={r.id} label={r.title} on={news.regions.includes(r.id)} onPress={() => set({ regions: toggle<RegionId>(news.regions, r.id) })} />
            ))}
          </View>
        </View>

        <Section footer="Paywalled publishers (FT, WSJ, NYT, Le Monde…) often need a subscription to read the full story.">
          <ToggleRow title="Show paywalled sources" value={news.showPaywalled} onChange={(showPaywalled) => set({ showPaywalled })} />
        </Section>

        <View style={styles.block}>
          <Txt variant="label">Sources</Txt>
          <Txt variant="caption">Prefer a source to see it first in For you and to lead each story; block one to never see it.</Txt>
          <TextInput value={sourceQuery} onChangeText={setSourceQuery} placeholder={`Search ${sources.length} sources`} placeholderTextColor={colors.textFaint} style={styles.input} autoCorrect={false} />
          {shownSources.map((s) => {
            const preferred = news.preferredSources.includes(s.id);
            const blocked = news.blockedSources.includes(s.id);
            return (
              <View key={s.id} style={styles.sourceRow}>
                <View style={styles.flex}>
                  <Text style={styles.sourceName}>{s.name}</Text>
                  <Txt variant="caption" numberOfLines={1}>
                    {[s.site, s.country === 'INT' ? 'International' : (countryByCode(s.country)?.name ?? s.country), s.language.toUpperCase(), s.paywall ? 'Paywall' : null, s.notes].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
                <Pressable onPress={() => set({ preferredSources: toggle(news.preferredSources, s.id), blockedSources: news.blockedSources.filter((x) => x !== s.id) })} hitSlop={6} accessibilityRole="button" accessibilityLabel={preferred ? `Stop preferring ${s.name}` : `Prefer ${s.name}`} style={styles.iconButton}>
                  <Ionicons name={preferred ? 'star' : 'star-outline'} size={20} color={preferred ? colors.text : colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => set({ blockedSources: toggle(news.blockedSources, s.id), preferredSources: news.preferredSources.filter((x) => x !== s.id) })} hitSlop={6} accessibilityRole="button" accessibilityLabel={blocked ? `Unblock ${s.name}` : `Block ${s.name}`} style={styles.iconButton}>
                  <Ionicons name={blocked ? 'ban' : 'ban-outline'} size={20} color={blocked ? colors.danger : colors.textMuted} />
                </Pressable>
              </View>
            );
          })}
          {!sq && chosenSources.length === 0 ? <Txt variant="caption">No preferred or blocked sources yet.</Txt> : null}
        </View>

        <View style={styles.block}>
          <Txt variant="label">Muted words</Txt>
          <Txt variant="caption">Stories with these words in the headline or summary are hidden.</Txt>
          <View style={styles.addRow}>
            <TextInput value={word} onChangeText={setWord} placeholder="A word or name" placeholderTextColor={colors.textFaint} style={[styles.input, styles.flex]} onSubmitEditing={addWord} returnKeyType="done" accessibilityLabel="Word to mute" />
            <Pressable onPress={addWord} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Mute word">
              <Ionicons name="add" size={22} color={colors.onAccent} />
            </Pressable>
          </View>
          <View style={styles.chips}>
            {news.mutedKeywords.map((w) => (
              <Chip key={w} label={`${w}  ✕`} on danger onPress={() => set({ mutedKeywords: news.mutedKeywords.filter((x) => x !== w) })} />
            ))}
          </View>
        </View>

        {news.muted.length ? (
          <View style={styles.block}>
            <Txt variant="label">Muted topics</Txt>
            {news.muted.map((id) => (
              <View key={id} style={styles.sourceRow}>
                <Text style={[styles.sourceName, styles.flex]}>{pathTitle(id)}</Text>
                <Pressable onPress={() => set({ muted: news.muted.filter((x) => x !== id) })} hitSlop={8} accessibilityRole="button">
                  <Txt style={styles.unmute}>Unmute</Txt>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, minHeight: 44 },
  title: { fontSize: 34, lineHeight: 40, fontFamily: FONT.display, color: colors.text },
  content: { paddingHorizontal: space.lg, gap: space.xl, paddingTop: space.lg },
  block: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: 36, paddingHorizontal: space.md + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipDanger: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  chipText: { fontSize: 14, fontFamily: FONT.regular, color: colors.text },
  chipTextOn: { color: colors.onAccent },
  field: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: colors.surface },
  fieldLabel: { fontSize: 16, fontFamily: FONT.regular, color: colors.text },
  fieldValue: { fontSize: 16, fontFamily: FONT.light, color: colors.textMuted },
  input: { height: 46, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, fontSize: 16, fontFamily: FONT.regular, color: colors.text },
  addRow: { flexDirection: 'row', gap: space.sm },
  addButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  sourceName: { fontSize: 16, lineHeight: 21, fontFamily: FONT.regular, color: colors.text },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  unmute: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
});
