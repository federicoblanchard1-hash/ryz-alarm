import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [open, setOpen] = useState<string | null>(first ? 'sport' : null);

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
    close();
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
          {first ? 'Welcome to Ryz' : 'Your news'}
        </Text>
        <Txt variant="muted" style={styles.subtitle}>
          {first ? 'What do you like to read in the morning? Pick topics for your news on the Morning screen. You can change them any time in Settings.' : 'Pick the topics for your morning news.'}
        </Txt>
        {CATEGORIES.map((c) => (
          <CategoryCard key={c.id} category={c} selected={selected} open={open === c.id} onToggleOpen={() => setOpen((o) => (o === c.id ? null : c.id))} onChange={change} />
        ))}
        <Txt variant="caption" style={styles.sources}>
          Stories come from BBC, The Guardian and Ars Technica, and open inside Ryz in a clean reader view.
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
  title: { fontSize: 34, lineHeight: 40, fontFamily: FONT.medium, color: colors.text, paddingHorizontal: space.xs },
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
  sources: { textAlign: 'center', marginTop: space.md, paddingHorizontal: space.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.bg },
  save: { height: 56, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 18, fontFamily: FONT.semibold, color: colors.onAccent },
});
