import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt, haptic } from '@/components/ui';
import { timeAgo, type Article } from '@/core/news';
import { clusterArticles } from '@/core/stories';
import { searchNews } from '@/services/news';
import { storyById } from '@/state/storyCache';
import { useStore } from '@/state/store';
import { useNow } from '@/state/useNow';
import { FONT, colors, radius, space } from '@/theme';

function openArticle(a: Article, story: string) {
  router.push({ pathname: '/article', params: { url: a.url, title: a.title, image: a.image ?? '', source: a.source, summary: a.summary, published: String(a.published), story } });
}

const dayLabel = (ms: number, now: number) => {
  const d = new Date(ms);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === new Date(now - 86_400_000).toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
};

/**
 * One page per big ongoing story: every publisher covering it, as a timeline,
 * plus the past week's coverage from Google News. You can follow the story.
 */
export default function StoryScreen() {
  const { id, q, title } = useLocalSearchParams<{ id: string; q?: string; title?: string }>();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const { data, updateSettings } = useStore();
  const news = data.settings.news;
  const story = storyById(id);
  const query = story?.query ?? q ?? title ?? '';
  const [more, setMore] = useState<{ status: 'loading' | 'ready' | 'error'; articles: Article[] }>({ status: 'loading', articles: [] });

  useEffect(() => {
    let cancelled = false;
    if (!query) return;
    searchNews(`${query} when:7d`, news.editions[0])
      .then((articles) => !cancelled && setMore({ status: 'ready', articles }))
      .catch(() => !cancelled && setMore({ status: 'error', articles: [] }));
    return () => {
      cancelled = true;
    };
  }, [query, news.editions]);

  // What we already had, plus the searches that belong to the same story.
  const timeline = useMemo(() => {
    const mine = story?.articles ?? [];
    const related = clusterArticles([...mine, ...more.articles]).find((s) => s.articles.some((a) => mine.some((m) => m.url === a.url)));
    const list = [...mine, ...(related ? related.articles : more.articles)];
    const seen = new Set<string>();
    return list.filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true))).sort((a, b) => b.published - a.published);
  }, [story, more.articles]);

  const lead = story?.lead ?? timeline[0];
  const sources = new Set(timeline.map((a) => a.source));
  const followed = news.entities.some((e) => e.kind === 'keyword' && e.name === query);
  const follow = () => {
    haptic('select');
    updateSettings({ news: { ...news, entities: followed ? news.entities.filter((e) => !(e.kind === 'keyword' && e.name === query)) : [...news.entities, { kind: 'keyword', name: query }] } });
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.xl, gap: space.lg }}>
        <Txt variant="label">Ongoing story</Txt>
        <Text style={styles.title} accessibilityRole="header">
          {lead?.title ?? title}
        </Text>
        {lead?.image ? <Image source={lead.image} style={styles.hero} contentFit="cover" transition={200} /> : null}
        <Txt variant="muted">{`${sources.size} ${sources.size === 1 ? 'source' : 'sources'} · ${timeline.length} updates${story ? ` · latest ${timeAgo(story.last, now).toLowerCase()}` : ''}`}</Txt>
        <Pressable onPress={follow} style={[styles.follow, followed && styles.followOn]} accessibilityRole="button" accessibilityState={{ selected: followed }}>
          <Ionicons name={followed ? 'checkmark' : 'add'} size={18} color={followed ? colors.onAccent : colors.text} />
          <Text style={[styles.followText, followed && styles.followTextOn]}>{followed ? 'Following this story' : 'Follow this story'}</Text>
        </Pressable>

        {timeline.map((a, i) => {
          const day = dayLabel(a.published, now);
          const heading = i === 0 || dayLabel(timeline[i - 1].published, now) !== day ? day : null;
          return (
            <View key={a.url}>
              {heading ? <Txt variant="label" style={styles.day}>{heading}</Txt> : null}
              <Pressable onPress={() => openArticle(a, id)} style={({ pressed }) => [styles.item, pressed && styles.pressed]} accessibilityRole="button">
                <View style={styles.dot} />
                <View style={styles.flex}>
                  <Text style={styles.meta}>{`${a.source} · ${timeAgo(a.published, now)}`}</Text>
                  <Text style={styles.itemTitle}>{a.title}</Text>
                  {a.summary ? (
                    <Text style={styles.summary} numberOfLines={2}>
                      {a.summary}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </View>
          );
        })}
        {more.status === 'loading' ? <ActivityIndicator color={colors.textMuted} /> : null}
        {more.status === 'error' ? <Txt variant="caption">Couldn’t load more coverage right now.</Txt> : null}
      </ScrollView>
      <View style={[styles.bar, { top: insets.top + space.sm }]}>
        <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={styles.round}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, gap: 4 },
  title: { fontSize: 32, lineHeight: 37, fontFamily: FONT.display, color: colors.text },
  hero: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: colors.surface },
  follow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start', height: 38, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  followOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  followText: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  followTextOn: { color: colors.onAccent },
  day: { marginTop: space.md, marginBottom: space.sm },
  item: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm },
  pressed: { opacity: 0.6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted, marginTop: 6 },
  meta: { fontSize: 13, fontFamily: FONT.regular, color: colors.textMuted },
  itemTitle: { fontSize: 17, lineHeight: 23, fontFamily: FONT.regular, color: colors.text },
  summary: { fontSize: 15, lineHeight: 21, fontFamily: FONT.light, color: colors.textMuted },
  bar: { position: 'absolute', left: space.lg },
  round: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
