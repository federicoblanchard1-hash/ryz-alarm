import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt, haptic } from '@/components/ui';
import { timeAgo, type Article } from '@/core/news';
import { followState, toggleFollow, toggleMute } from '@/core/newsPrefs';
import { PAYWALLED_PUBLISHERS } from '@/core/sources';
import { tagArticle } from '@/core/tagging';
import { nodeById } from '@/core/taxonomy';
import { openInAppBrowser } from '@/services/news';
import { storyById, storyOfArticle } from '@/state/storyCache';
import { useStore } from '@/state/store';
import { useNow } from '@/state/useNow';
import { FONT, colors, radius, space } from '@/theme';

type Params = { url: string; title?: string; image?: string; source?: string; summary?: string; published?: string; story?: string };

const READ_VERB: Record<string, string> = { video: 'Watch', audio: 'Listen', live: 'Follow live', gallery: 'See the photos' };

/**
 * A story's card: headline, summary, picture, where it's from and how it's
 * tagged, and every other publisher covering it. The story itself is read on
 * the publisher's site (in Ryz's in-app browser): Ryz doesn't copy articles.
 */
export default function ArticleScreen() {
  const { url, title, image, source, summary, published, story: storyId } = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const { data, updateSettings } = useStore();
  const story = storyOfArticle(url) ?? (storyId ? storyById(storyId) : undefined);
  // Opened from somewhere the article wasn't tagged yet (a story page's extra coverage): tag it now.
  const article: Article = useMemo(
    () => story?.articles.find((a) => a.url === url) ?? { id: url, url, title: title ?? '', summary: summary ?? '', image: image || undefined, source: source ?? '', published: Number(published) || 0, topic: 'search', paywall: PAYWALLED_PUBLISHERS.has(source ?? '') },
    [story, url, title, summary, image, source, published],
  );
  const tags = useMemo(() => article.tags ?? tagArticle(article, data.settings.news.entities), [article, data.settings.news.entities]);
  const others = story ? story.articles.filter((a) => a.url !== url) : [];
  const when = published ? timeAgo(Number(published), now) : '';
  const format = tags.format;
  const verb = READ_VERB[format] ?? 'Read the full story';

  const follows = data.settings.newsTopics ?? [];
  const news = data.settings.news;
  // The most specific topic it's tagged with, for one-tap follow or mute.
  const topic = tags.topics.map((id) => nodeById(id)).filter((n) => n && !n.local).sort((a, b) => b!.depth - a!.depth)[0];
  const state = topic ? followState(topic.id, follows, news.muted) : null;
  const blocked = news.blockedSources.includes(source ?? '');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const setChoice = (next: { follows: string[]; muted: string[] }) => {
    haptic('select');
    updateSettings({ newsTopics: next.follows, news: { ...news, muted: next.muted } });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        {image ? <Image source={image} style={styles.hero} contentFit="cover" transition={200} accessibilityIgnoresInvertColors /> : <View style={{ height: insets.top + 56 }} />}
        <View style={styles.body}>
          <Text style={styles.meta}>{[source, when, article.paywall ? 'Paywall' : null].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {summary ? <Text style={styles.p}>{summary}</Text> : null}

          <Button title={`${verb} on ${source || 'the publisher’s site'}`} icon="open-outline" onPress={() => openInAppBrowser(url)} />
          <Txt variant="caption">Ryz shows the headline, a short summary and the picture. The story belongs to its publisher and opens on their site.</Txt>

          {tags.categories.length || tags.entities.length ? (
            <View style={styles.tags}>
              {[...tags.categories.map((id) => nodeById(id)?.title), ...tags.entities.slice(0, 5), ...tags.regions.map((r) => r.replace('-', ' '))]
                .filter(Boolean)
                .map((label, i) => (
                  <View key={`${label}${i}`} style={styles.tag}>
                    <Text style={styles.tagText}>{label}</Text>
                  </View>
                ))}
            </View>
          ) : null}

          {topic ? (
            <View style={styles.actions}>
              <Pressable onPress={() => setChoice(toggleFollow(topic.id, follows, news.muted))} style={[styles.action, state === 'followed' && styles.actionOn]} accessibilityRole="button">
                <Text style={[styles.actionText, state === 'followed' && styles.actionTextOn]}>{state === 'followed' ? `Following ${topic.title}` : `Follow ${topic.title}`}</Text>
              </Pressable>
              <Pressable onPress={() => setChoice(toggleMute(topic.id, follows, news.muted))} style={styles.action} accessibilityRole="button">
                <Text style={styles.actionText}>{state === 'muted' ? `Unmute ${topic.title}` : `Mute ${topic.title}`}</Text>
              </Pressable>
              {source ? (
                <Pressable onPress={() => updateSettings({ news: { ...news, blockedSources: blocked ? news.blockedSources.filter((s) => s !== source) : [...news.blockedSources, source] } })} style={styles.action} accessibilityRole="button">
                  <Text style={styles.actionText}>{blocked ? `Unblock ${source}` : `Block ${source}`}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {others.length ? (
            <View style={styles.others}>
              <Txt variant="label">{`Also covered by ${others.length}`}</Txt>
              {others.map((a) => (
                <Pressable key={a.url} onPress={() => openInAppBrowser(a.url)} style={({ pressed }) => [styles.other, pressed && styles.pressed]} accessibilityRole="link">
                  <Text style={styles.otherSource}>{`${a.source} · ${timeAgo(a.published, now)}`}</Text>
                  <Text style={styles.otherTitle} numberOfLines={2}>
                    {a.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={styles.round}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => Share.share({ message: `${title} ${url}`, url })} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share" style={styles.round}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.surface },
  body: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.lg },
  meta: { fontSize: 14, lineHeight: 19, fontFamily: FONT.regular, color: colors.textMuted },
  title: { fontSize: 34, lineHeight: 39, fontFamily: FONT.display, color: colors.text, marginTop: -space.sm },
  p: { fontSize: 18, lineHeight: 28, fontFamily: FONT.light, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tag: { paddingHorizontal: space.sm + 2, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surface },
  tagText: { fontSize: 13, fontFamily: FONT.regular, color: colors.textMuted, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  action: { minHeight: 36, paddingHorizontal: space.md + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center' },
  actionOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionText: { fontSize: 14, fontFamily: FONT.regular, color: colors.text },
  actionTextOn: { color: colors.onAccent },
  others: { gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.lg },
  other: { paddingVertical: space.sm, gap: 2 },
  pressed: { opacity: 0.6 },
  otherSource: { fontSize: 13, fontFamily: FONT.regular, color: colors.textMuted },
  otherTitle: { fontSize: 16, lineHeight: 21, fontFamily: FONT.regular, color: colors.text },
  bar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
