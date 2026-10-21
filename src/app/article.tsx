import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { haptic } from '@/components/ui';
import { timeAgo, type Article } from '@/core/news';
import { followState, toggleFollow, toggleMute } from '@/core/newsPrefs';
import type { ReadableArticle } from '@/core/reader';
import { PAYWALLED_PUBLISHERS } from '@/core/sources';
import { tagArticle } from '@/core/tagging';
import { nodeById } from '@/core/taxonomy';
import { fetchReadable, openInAppBrowser } from '@/services/news';
import { storyById, storyOfArticle } from '@/state/storyCache';
import { useStore } from '@/state/store';
import { useNow } from '@/state/useNow';
import { FONT, colors, radius, space } from '@/theme';

type Params = { url: string; title?: string; image?: string; source?: string; summary?: string; published?: string; story?: string };

/**
 * A story, read inside Ryz. The reader view shows its text and pictures
 * without the site's pop-ups and banners; a page that can't be read that way
 * (a video, a Google News link, a site that hides its text) shows as the page
 * itself, still inside Ryz.
 */
export default function ArticleScreen() {
  const { url, title, image, source, summary, published, story: storyId } = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const { data, updateSettings } = useStore();
  // Google News links only lead to the story through a browser redirect.
  const [view, setView] = useState<'loading' | 'reader' | 'page'>(url.includes('news.google.com') ? 'page' : 'loading');
  const [reader, setReader] = useState<ReadableArticle | null>(null);

  useEffect(() => {
    if (view !== 'loading') return;
    let cancelled = false;
    fetchReadable(url).then((r) => {
      if (cancelled) return;
      setReader(r);
      setView(r ? 'reader' : 'page');
    });
    return () => {
      cancelled = true;
    };
  }, [url, view]);

  const story = storyOfArticle(url) ?? (storyId ? storyById(storyId) : undefined);
  const article: Article = useMemo(
    () => story?.articles.find((a) => a.url === url) ?? { id: url, url, title: title ?? '', summary: summary ?? '', image: image || undefined, source: source ?? '', published: Number(published) || 0, topic: 'search', paywall: PAYWALLED_PUBLISHERS.has(source ?? '') },
    [story, url, title, summary, image, source, published],
  );
  const tags = useMemo(() => article.tags ?? tagArticle(article, data.settings.news.entities), [article, data.settings.news.entities]);
  const others = story ? story.sources.length - 1 : 0;
  const follows = data.settings.newsTopics ?? [];
  const news = data.settings.news;
  // The most specific topic it's tagged with, for one-tap follow or mute.
  const topic = tags.topics.map((id) => nodeById(id)).filter((n) => n && !n.local).sort((a, b) => b!.depth - a!.depth)[0];
  const state = topic ? followState(topic.id, follows, news.muted) : null;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const setChoice = (next: { follows: string[]; muted: string[] }) => {
    haptic('select');
    updateSettings({ newsTopics: next.follows, news: { ...news, muted: next.muted } });
  };
  const share = () => Share.share({ message: `${title} ${url}`, url });

  if (view === 'page') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.pageBar}>
          <Pressable onPress={reader ? () => setView('reader') : close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={styles.barButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.pageSource} numberOfLines={1}>
            {source}
          </Text>
          <Pressable onPress={share} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share" style={styles.barButton}>
            <Ionicons name="share-outline" size={21} color={colors.text} />
          </Pressable>
        </View>
        {Platform.OS === 'web' ? (
          // The web preview can't embed other sites; phones show the page right here.
          <View style={styles.webFallback}>
            <Text style={styles.title}>{title}</Text>
            {summary ? <Text style={styles.p}>{summary}</Text> : null}
            <Pressable onPress={() => openInAppBrowser(url)} accessibilityRole="link">
              <Text style={styles.link}>{`Open on ${source || 'the site'}`}</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            source={{ uri: url }}
            style={styles.web}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.textMuted} />
              </View>
            )}
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
          />
        )}
      </View>
    );
  }

  const hero = reader?.image || image || undefined;
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        {hero ? <Image source={hero} style={styles.hero} contentFit="cover" transition={200} accessibilityIgnoresInvertColors /> : <View style={{ height: insets.top + 56 }} />}
        <View style={styles.body}>
          <Text style={styles.meta}>{[source, published ? timeAgo(Number(published), now) : '', article.paywall ? 'Paywall' : ''].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {reader?.title || title}
          </Text>
          {reader?.byline ? <Text style={styles.byline}>{reader.byline}</Text> : null}

          {view === 'loading' ? (
            <>
              {summary ? <Text style={styles.p}>{summary}</Text> : null}
              <ActivityIndicator color={colors.textMuted} style={styles.spinner} />
            </>
          ) : null}

          {reader?.blocks.map((b, i) => {
            if (b.type === 'img') {
              return (
                <View key={i} style={styles.figure}>
                  <Image source={b.src} style={styles.figureImage} contentFit="cover" transition={200} />
                  {b.caption ? <Text style={styles.caption}>{b.caption}</Text> : null}
                </View>
              );
            }
            if (b.type === 'h') return <Text key={i} style={styles.h}>{b.text}</Text>;
            if (b.type === 'quote') return <Text key={i} style={styles.quote}>{b.text}</Text>;
            return <Text key={i} style={styles.p}>{b.text}</Text>;
          })}

          {view === 'reader' ? (
            <View style={styles.footer}>
              <Pressable onPress={() => setView('page')} accessibilityRole="button" style={styles.footerRow}>
                <Text style={styles.footerText}>{`Original page on ${source || 'the site'}`}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
              {others > 0 && story ? (
                <Pressable onPress={() => router.push({ pathname: '/story/[id]', params: { id: story.id, q: story.query, title: story.lead.title } })} accessibilityRole="button" style={styles.footerRow}>
                  <Text style={styles.footerText}>{`Also in ${others} more ${others === 1 ? 'source' : 'sources'}`}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
              {topic ? (
                <View style={styles.actions}>
                  <Pressable onPress={() => setChoice(toggleFollow(topic.id, follows, news.muted))} accessibilityRole="button" style={[styles.action, state === 'followed' && styles.actionOn]}>
                    <Text style={[styles.actionText, state === 'followed' && styles.actionTextOn]}>{state === 'followed' ? `Following ${topic.title}` : `Follow ${topic.title}`}</Text>
                  </Pressable>
                  <Pressable onPress={() => setChoice(toggleMute(topic.id, follows, news.muted))} accessibilityRole="button" style={styles.action}>
                    <Text style={styles.actionText}>{state === 'muted' ? 'Unmute' : 'Mute'}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={styles.round}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={share} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share" style={styles.round}>
          <Ionicons name="share-outline" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.surface },
  body: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.lg },
  meta: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regular, color: colors.textMuted },
  title: { fontSize: 32, lineHeight: 37, fontFamily: FONT.display, color: colors.text, marginTop: -space.sm },
  byline: { fontSize: 14, lineHeight: 19, fontFamily: FONT.regular, color: colors.textMuted, marginTop: -space.sm },
  spinner: { paddingVertical: space.xl },
  p: { fontSize: 18, lineHeight: 29, fontFamily: FONT.light, color: colors.text },
  h: { fontSize: 20, lineHeight: 27, fontFamily: FONT.medium, color: colors.text, marginTop: space.sm },
  quote: { fontSize: 21, lineHeight: 29, fontFamily: FONT.displayItalic, color: colors.text, borderLeftWidth: 2, borderLeftColor: colors.text, paddingLeft: space.lg },
  figure: { gap: space.sm, marginHorizontal: -space.xl },
  figureImage: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.surface },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: FONT.light, color: colors.textMuted, paddingHorizontal: space.xl },
  footer: { marginTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  footerText: { fontSize: 15, fontFamily: FONT.regular, color: colors.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: space.md },
  action: { minHeight: 32, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  actionOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionText: { fontSize: 13, fontFamily: FONT.regular, color: colors.textMuted },
  actionTextOn: { color: colors.onAccent },
  bar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: 'rgba(28,28,30,0.92)', alignItems: 'center', justifyContent: 'center' },
  pageBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, height: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  barButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pageSource: { flex: 1, textAlign: 'center', fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  web: { flex: 1, backgroundColor: colors.bg },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  webFallback: { padding: space.xl, gap: space.lg },
  link: { fontSize: 16, fontFamily: FONT.medium, color: colors.text },
});
