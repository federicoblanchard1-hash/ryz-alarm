import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt } from '@/components/ui';
import { timeAgo, type ReadableArticle } from '@/core/news';
import { fetchReadable, openInAppBrowser } from '@/services/news';
import { useNow } from '@/state/useNow';
import { FONT, colors, radius, space } from '@/theme';

type Params = { url: string; title?: string; image?: string; source?: string; summary?: string; published?: string };

/**
 * A story in Ryz's own reader view: the text and pictures only, so the site's
 * pop-ups, cookie banners and sign-up walls never appear. If the page can't
 * be read here, the original opens in an in-app browser (Safari Reader on iPhone).
 */
export default function ArticleScreen() {
  const { url, title, image, source, summary, published } = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const [article, setArticle] = useState<ReadableArticle | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetchReadable(url).then((result) => {
      if (cancelled) return;
      setArticle(result);
      setState(result ? 'ready' : 'failed');
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const heading = article?.title || title || '';
  const hero = article?.image || image || undefined;
  const when = published ? timeAgo(Number(published), now) : '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        {hero ? <Image source={hero} style={styles.hero} contentFit="cover" transition={200} accessibilityIgnoresInvertColors /> : <View style={{ height: insets.top + 56 }} />}
        <View style={styles.body}>
          <Text style={styles.meta}>{[source, when].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {heading}
          </Text>
          {article?.byline ? <Text style={styles.byline}>{article.byline}</Text> : null}

          {state === 'loading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : null}

          {article?.blocks.map((b, i) => {
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

          {state === 'failed' ? (
            <View style={styles.failed}>
              {summary ? <Text style={styles.p}>{summary}</Text> : null}
              <Txt variant="caption">
                {"Ryz couldn't read the full story here: it may be a video, or the site doesn't share it outside a browser in your region."}
              </Txt>
              <Button title="Read it in Ryz's browser" icon="reader-outline" variant="secondary" onPress={() => openInAppBrowser(url)} />
            </View>
          ) : null}

          {state === 'ready' ? (
            <Pressable onPress={() => openInAppBrowser(url)} accessibilityRole="button" style={styles.original}>
              <Txt variant="caption">{`Source: ${source ?? 'original article'}. Open the original page`}</Txt>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={styles.round}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => Share.share({ message: `${heading} ${url}`, url })} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share" style={styles.round}>
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
  title: { fontSize: 28, lineHeight: 35, fontFamily: FONT.medium, color: colors.text, marginTop: -space.sm },
  byline: { fontSize: 15, lineHeight: 20, fontFamily: FONT.regular, color: colors.textMuted, marginTop: -space.sm },
  loading: { paddingVertical: space.xxl },
  p: { fontSize: 18, lineHeight: 29, fontFamily: FONT.light, color: colors.text },
  h: { fontSize: 21, lineHeight: 28, fontFamily: FONT.medium, color: colors.text, marginTop: space.sm },
  quote: { fontSize: 19, lineHeight: 28, fontFamily: FONT.regular, color: colors.text, borderLeftWidth: 3, borderLeftColor: colors.text, paddingLeft: space.lg },
  figure: { gap: space.sm, marginHorizontal: -space.xl },
  figureImage: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.surface },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: FONT.light, color: colors.textMuted, paddingHorizontal: space.xl },
  failed: { gap: space.lg },
  original: { paddingVertical: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
