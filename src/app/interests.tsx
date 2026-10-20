import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Txt, haptic, type IconName } from '@/components/ui';
import { CATEGORIES, type Category } from '@/core/news';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

function CategoryCard({ category, selected, open, onToggleOpen, onChange }: { category: Category; selected: Set<string>; open: boolean; onToggleOpen: () => void; onChange: (ids: string[], on: boolean) => void }) {
  const reduced = useReducedMotion();
  const ids = category.topics.map((t) => t.id);
  const count = ids.filter((id) => selected.has(id)).length;
  const all = count === ids.length;
  return (
    <View style={[styles.card, count > 0 && styles.cardOn]}>
      <Pressable onPress={onToggleOpen} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${category.title}, ${count} of ${ids.length} picked`} style={styles.cardHead}>
        <View style={[styles.icon, count > 0 && styles.iconOn]}>
          <Ionicons name={category.icon as IconName} size={22} color={count > 0 ? colors.onAccent : colors.text} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{category.title}</Text>
          <Text style={styles.cardCount}>{count === 0 ? `${ids.length} topics` : all ? 'All topics' : `${count} of ${ids.length}`}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(180)} style={styles.topics}>
          <Pressable
            onPress={() => {
              haptic('select');
              onChange(ids, !all);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: all }}
            style={[styles.chip, styles.allChip, all && styles.chipOn]}
          >
            <Text style={[styles.chipText, all && styles.chipTextOn]}>{all ? 'All ✓' : 'All'}</Text>
          </Pressable>
          {category.topics.map((t) => {
            const on = selected.has(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  haptic('select');
                  onChange([t.id], !on);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.title}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Pick news topics: on first launch, and from Settings or "Edit" on the feed. */
export default function Interests() {
  const { first } = useLocalSearchParams<{ first?: string }>();
  const { data, updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(() => new Set(data.settings.newsTopics ?? []));
  const [open, setOpen] = useState<string | null>(first ? 'world' : null);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // Searching shows every matching topic across all categories.
  const matches = q ? CATEGORIES.flatMap((c) => c.topics.filter((t) => t.title.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)).map((t) => ({ topic: t, category: c }))) : [];

  const change = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const save = (topics: string[]) => {
    updateSettings({ newsTopics: topics });
    haptic('success');
    // During onboarding the next step is goals.
    if (first) router.replace({ pathname: '/goals', params: { first: '1' } });
    else close();
  };
  // Keep the catalogue's order, not the order they were tapped.
  const ordered = CATEGORIES.flatMap((c) => c.topics.map((t) => t.id)).filter((id) => selected.has(id));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.md }]}>
      <View style={styles.top}>
        <View />
        <Pressable onPress={first ? () => save([]) : close} hitSlop={12} accessibilityRole="button" accessibilityLabel={first ? 'Skip' : 'Close without saving'}>
          {first ? <Txt style={styles.skip}>Skip</Txt> : <Ionicons name="close" size={30} color={colors.text} />}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}>
        <Text style={styles.title} accessibilityRole="header">
          {first ? 'Your morning news' : 'Your news'}
        </Text>
        <Txt variant="muted" style={styles.subtitle}>
          {first ? 'What do you like to read in the morning? Pick topics, and open any category for its sub-topics. You can change them any time in Settings.' : 'Pick the topics for your morning news.'}
        </Txt>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search topics: a country, a team, a sport…"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
            autoCorrect={false}
            accessibilityLabel="Search topics"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {q ? (
          <View style={styles.results}>
            {matches.length === 0 ? <Txt variant="muted">{`No topic matches “${query.trim()}”.`}</Txt> : null}
            {matches.slice(0, 80).map(({ topic, category }) => {
              const on = selected.has(topic.id);
              return (
                <Pressable
                  key={topic.id}
                  onPress={() => {
                    haptic('select');
                    change([topic.id], !on);
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{`${topic.title} · ${category.title}`}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          CATEGORIES.map((c) => (
          <CategoryCard key={c.id} category={c} selected={selected} open={open === c.id} onToggleOpen={() => setOpen((o) => (o === c.id ? null : c.id))} onChange={change} />
          ))
        )}
        <Txt variant="caption" style={styles.sources}>
          Stories come from over 50 free publishers plus Google News (BBC, The Guardian, The New York Times, Sky, France 24, Euronews, Wired, The Verge, ESPN, Variety…), mixed evenly, and open inside Ryz in a clean reader view.
        </Txt>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PressableScale onPress={() => save(ordered)} disabled={ordered.length === 0 && Boolean(first)} style={styles.save} accessibilityLabel="Save topics">
          <Text style={styles.saveText}>{ordered.length === 0 ? (first ? 'Pick a topic' : 'Turn off news') : `Continue · ${ordered.length} ${ordered.length === 1 ? 'topic' : 'topics'}`}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, minHeight: 44 },
  skip: { fontSize: 17, fontFamily: FONT.regular, color: colors.textMuted },
  content: { paddingHorizontal: space.lg, gap: space.md },
  title: { fontSize: 42, lineHeight: 48, fontFamily: FONT.display, color: colors.text, paddingHorizontal: space.xs },
  subtitle: { paddingHorizontal: space.xs, marginBottom: space.md },
  card: { borderRadius: radius.md + 6, backgroundColor: colors.surface, overflow: 'hidden' },
  cardOn: { borderWidth: 1, borderColor: colors.borderStrong },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.accent },
  cardTitle: { fontSize: 18, lineHeight: 24, fontFamily: FONT.medium, color: colors.text },
  cardCount: { fontSize: 14, lineHeight: 19, fontFamily: FONT.light, color: colors.textMuted },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.lg },
  chip: { minHeight: 38, paddingHorizontal: space.md + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center' },
  allChip: { borderStyle: 'dashed' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent, borderStyle: 'solid' },
  chipText: { fontSize: 15, fontFamily: FONT.regular, color: colors.text },
  chipTextOn: { color: colors.onAccent },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 46, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.surface, marginBottom: space.xs },
  searchInput: { flex: 1, height: '100%', fontSize: 16, fontFamily: FONT.regular, color: colors.text, paddingVertical: 0 },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  sources: { textAlign: 'center', marginTop: space.md, paddingHorizontal: space.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.bg },
  save: { height: 56, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 18, fontFamily: FONT.semibold, color: colors.onAccent },
});
