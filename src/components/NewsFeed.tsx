import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { timeAgo, topicById, type Article } from '@/core/news';
import { useNews } from '@/state/useNews';
import { useNow } from '@/state/useNow';
import { FONT, colors, radius, space } from '@/theme';
import { PressableScale, Txt } from './ui';

function openArticle(a: Article) {
  router.push({ pathname: '/article', params: { url: a.url, title: a.title, image: a.image ?? '', source: a.source, summary: a.summary, published: String(a.published) } });
}

function Meta({ article, now }: { article: Article; now: number }) {
  return (
    <Text style={styles.meta} numberOfLines={1}>
      {`${article.source} · ${timeAgo(article.published, now)}`}
    </Text>
  );
}

function Lead({ article, now }: { article: Article; now: number }) {
  return (
    <PressableScale onPress={() => openArticle(article)} style={styles.lead} accessibilityLabel={`${article.title}. ${article.source}`}>
      {article.image ? <Image source={article.image} style={styles.leadImage} contentFit="cover" transition={200} /> : null}
      <View style={styles.leadText}>
        <Meta article={article} now={now} />
        <Text style={styles.leadTitle}>{article.title}</Text>
        {article.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {article.summary}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

function Row({ article, now }: { article: Article; now: number }) {
  return (
    <Pressable onPress={() => openArticle(article)} accessibilityRole="button" accessibilityLabel={`${article.title}. ${article.source}`} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={3}>
          {article.title}
        </Text>
        <Meta article={article} now={now} />
      </View>
      {article.image ? <Image source={article.image} style={styles.thumb} contentFit="cover" transition={200} /> : null}
    </Pressable>
  );
}

/** "Your news" on Morning: a filter per chosen topic, a lead story, then a list. */
export function NewsFeed({ topics }: { topics: string[] }) {
  const { articles, status, refresh } = useNews(topics);
  const [filter, setFilter] = useState<string | null>(null);
  const now = useNow(60_000);
  const shown = filter ? articles.filter((a) => a.topic === filter) : articles;
  const [lead, ...rest] = shown;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Txt style={styles.title} accessibilityRole="header">Your news</Txt>
        <Pressable onPress={() => router.push('/interests')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit news topics">
          <Txt style={styles.edit}>Edit</Txt>
        </Pressable>
      </View>

      {topics.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
          {[null, ...topics].map((id) => {
            const on = filter === id;
            return (
              <Pressable
                key={id ?? 'all'}
                onPress={() => setFilter(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.filter, on && styles.filterOn]}
              >
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{id ? (topicById(id)?.title ?? id) : 'All'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {status === 'loading' && articles.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : status === 'error' && articles.length === 0 ? (
        <Pressable onPress={refresh} style={styles.state} accessibilityRole="button">
          <Ionicons name="cloud-offline-outline" size={26} color={colors.textMuted} />
          <Txt variant="muted">{"Couldn't load the news. Tap to try again."}</Txt>
        </Pressable>
      ) : (
        <>
          {lead ? <Lead article={lead} now={now} /> : <Txt variant="muted" style={styles.empty}>Nothing new here yet.</Txt>}
          {rest.slice(0, 24).map((a) => (
            <Row key={a.id} article={a} now={now} />
          ))}
        </>
      )}
    </View>
  );
}

/** Shown on Morning until topics are picked. */
export function NewsPrompt() {
  return (
    <PressableScale onPress={() => router.push('/interests')} style={styles.prompt} accessibilityLabel="Pick your news topics">
      <Ionicons name="newspaper-outline" size={26} color={colors.text} />
      <View style={styles.rowText}>
        <Txt variant="heading">Your morning news</Txt>
        <Txt variant="caption">Pick what you like to read: sport, tech, world and more.</Txt>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 24, lineHeight: 30, fontFamily: FONT.medium, color: colors.text },
  edit: { fontSize: 16, lineHeight: 22, fontFamily: FONT.regular, color: colors.textMuted },
  filterScroll: { marginHorizontal: -space.lg },
  filters: { gap: space.sm, paddingHorizontal: space.lg },
  filter: { paddingHorizontal: space.md + 2, height: 34, borderRadius: radius.pill, backgroundColor: colors.surface, justifyContent: 'center' },
  filterOn: { backgroundColor: colors.accent },
  filterText: { fontSize: 15, fontFamily: FONT.regular, color: colors.text },
  filterTextOn: { color: colors.onAccent },
  state: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  empty: { paddingVertical: space.lg },
  lead: { borderRadius: radius.lg - 6, backgroundColor: colors.surface, overflow: 'hidden' },
  leadImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceRaised },
  leadText: { padding: space.lg, gap: 6 },
  leadTitle: { fontSize: 21, lineHeight: 27, fontFamily: FONT.medium, color: colors.text },
  summary: { fontSize: 15, lineHeight: 21, fontFamily: FONT.light, color: colors.textMuted },
  meta: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regular, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 6 },
  rowTitle: { fontSize: 17, lineHeight: 23, fontFamily: FONT.regular, color: colors.text },
  thumb: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md + 4, backgroundColor: colors.surface, marginTop: space.lg },
});
