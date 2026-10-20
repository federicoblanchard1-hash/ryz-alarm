import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { filterArticles, timeAgo, topicById, type Article } from "@/core/news";
import { openInAppBrowser, searchNews } from "@/services/news";
import { onNearBottom } from "@/state/nearBottom";
import { useNews } from "@/state/useNews";
import { useNow } from "@/state/useNow";
import { FONT, colors, radius, space } from "@/theme";
import { PressableScale, Txt } from "./ui";

function openArticle(a: Article) {
  // Search results link through Google News, which only a browser can follow.
  if (a.url.includes("news.google.com")) {
    openInAppBrowser(a.url);
    return;
  }
  router.push({
    pathname: "/article",
    params: {
      url: a.url,
      title: a.title,
      image: a.image ?? "",
      source: a.source,
      summary: a.summary,
      published: String(a.published),
    },
  });
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
    <PressableScale
      onPress={() => openArticle(article)}
      style={styles.lead}
      accessibilityLabel={`${article.title}. ${article.source}`}
    >
      {article.image ? (
        <Image
          source={article.image}
          style={styles.leadImage}
          contentFit="cover"
          transition={200}
        />
      ) : null}
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
    <Pressable
      onPress={() => openArticle(article)}
      accessibilityRole="button"
      accessibilityLabel={`${article.title}. ${article.source}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={3}>
          {article.title}
        </Text>
        <Meta article={article} now={now} />
      </View>
      {article.image ? (
        <Image
          source={article.image}
          style={styles.thumb}
          contentFit="cover"
          transition={200}
        />
      ) : null}
    </Pressable>
  );
}

/** Stories added each time you reach the end. */
const PAGE = 15;

type WebResults = {
  query: string;
  status: "loading" | "ready" | "error";
  articles: Article[];
};

/** Searches every publisher a moment after typing stops. */
function useWebSearch(query: string): WebResults | null {
  const q = query.trim();
  const [results, setResults] = useState<WebResults | null>(null);
  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setResults({ query: q, status: "loading", articles: [] });
      searchNews(q)
        .then(
          (articles) =>
            !cancelled && setResults({ query: q, status: "ready", articles }),
        )
        .catch(
          () =>
            !cancelled &&
            setResults({ query: q, status: "error", articles: [] }),
        );
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);
  return results && results.query === q
    ? results
    : q.length >= 2
      ? { query: q, status: "loading", articles: [] }
      : null;
}

function SearchResults({
  query,
  mine,
  now,
}: {
  query: string;
  mine: Article[];
  now: number;
}) {
  const web = useWebSearch(query);
  const ids = new Set(mine.map((a) => a.title.toLowerCase()));
  const others = (web?.articles ?? []).filter(
    (a) => !ids.has(a.title.toLowerCase()),
  );
  return (
    <>
      {mine.length > 0 ? <Txt variant="label">In your news</Txt> : null}
      {mine.slice(0, 10).map((a) => (
        <Row key={a.id} article={a} now={now} />
      ))}
      <Txt variant="label" style={styles.searchLabel}>
        From everywhere
      </Txt>
      {web?.status === "loading" ? (
        <ActivityIndicator
          color={colors.textMuted}
          style={styles.searchSpinner}
        />
      ) : web?.status === "error" ? (
        <Txt variant="muted">
          {"Couldn't search right now. Check your connection."}
        </Txt>
      ) : others.length === 0 ? (
        <Txt variant="muted">{`Nothing found for “${query.trim()}”.`}</Txt>
      ) : (
        others.map((a) => <Row key={a.id} article={a} now={now} />)
      )}
    </>
  );
}

/** "Your news" on Morning: a search, a filter per chosen topic, a lead story, then a list. */
export function NewsFeed({ topics }: { topics: string[] }) {
  const { articles, status, refresh, refreshing, updatedAt, loadOlder, olderStatus } =
    useNews(topics);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Stories on screen; scrolling near the end shows more, then fetches older ones.
  const [visible, setVisible] = useState(PAGE);
  const searching = query.trim().length > 0;
  const now = useNow(60_000);
  const shown = filter ? articles.filter((a) => a.topic === filter) : articles;
  const [lead, ...rest] = shown;
  const moreHere = rest.length > visible;

  const latest = useRef({ moreHere, searching, loadOlder });
  useLayoutEffect(() => {
    latest.current = { moreHere, searching, loadOlder };
  });
  useEffect(
    () =>
      onNearBottom(() => {
        const l = latest.current;
        if (l.searching) return;
        if (l.moreHere) setVisible((v) => v + PAGE);
        else {
          setVisible((v) => v + PAGE);
          l.loadOlder();
        }
      }),
    [],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Txt style={styles.title} accessibilityRole="header">
          Your news
        </Txt>
        <Pressable
          onPress={() => router.push("/interests")}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Edit news topics"
        >
          <Txt style={styles.edit}>Edit</Txt>
        </Pressable>
      </View>
      {updatedAt > 0 ? (
        <Pressable
          onPress={refresh}
          disabled={refreshing}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Refresh news"
          style={styles.updated}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Ionicons name="refresh" size={14} color={colors.textMuted} />
          )}
          <Text style={styles.meta}>
            {refreshing
              ? "Updating…"
              : `Updated ${timeAgo(updatedAt, now).toLowerCase()}`}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search any news"
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search news"
        />
        {searching ? (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        <SearchResults
          query={query}
          mine={filterArticles(articles, query)}
          now={now}
        />
      ) : (
        <>
          {topics.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filters}
            >
              {[null, ...topics].map((id) => {
                const on = filter === id;
                return (
                  <Pressable
                    key={id ?? "all"}
                    onPress={() => {
                      setFilter(id);
                      setVisible(PAGE);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={[styles.filter, on && styles.filterOn]}
                  >
                    <Text
                      style={[styles.filterText, on && styles.filterTextOn]}
                    >
                      {id ? (topicById(id)?.title ?? id) : "All"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {status === "loading" && articles.length === 0 ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : status === "error" && articles.length === 0 ? (
            <Pressable
              onPress={refresh}
              style={styles.state}
              accessibilityRole="button"
            >
              <Ionicons
                name="cloud-offline-outline"
                size={26}
                color={colors.textMuted}
              />
              <Txt variant="muted">
                {"Couldn't load the news. Tap to try again."}
              </Txt>
            </Pressable>
          ) : (
            <>
              {lead ? (
                <Lead article={lead} now={now} />
              ) : (
                <Txt variant="muted" style={styles.empty}>
                  Nothing new here yet.
                </Txt>
              )}
              {rest.slice(0, visible).map((a) => (
                <Row key={a.id} article={a} now={now} />
              ))}
              {lead ? (
                <View style={styles.more}>
                  {olderStatus === "loading" ? (
                    <>
                      <ActivityIndicator color={colors.textMuted} />
                      <Txt variant="caption">Loading older news…</Txt>
                    </>
                  ) : olderStatus === "done" && !moreHere ? (
                    <Txt variant="caption">{"That's all the older news for now."}</Txt>
                  ) : olderStatus === "error" && !moreHere ? (
                    <Pressable onPress={loadOlder} hitSlop={8} accessibilityRole="button">
                      <Txt variant="caption">{"Couldn't load older news. Tap to try again."}</Txt>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setVisible((v) => v + PAGE);
                        if (!moreHere) loadOlder();
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Txt variant="caption">Scroll for more</Txt>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </>
          )}
        </>
      )}
    </View>
  );
}

/** Shown on Morning until topics are picked. */
export function NewsPrompt() {
  return (
    <PressableScale
      onPress={() => router.push("/interests")}
      style={styles.prompt}
      accessibilityLabel="Pick your news topics"
    >
      <Ionicons name="newspaper-outline" size={26} color={colors.text} />
      <View style={styles.rowText}>
        <Txt variant="heading">Your morning news</Txt>
        <Txt variant="caption">
          Pick what you like to read: sport, tech, world and more.
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  more: { alignItems: "center", gap: space.sm, paddingVertical: space.xl },
  wrap: { marginTop: space.lg, gap: space.md },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 38,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    fontFamily: FONT.regular,
    color: colors.text,
    paddingVertical: 0,
  },
  searchLabel: { marginTop: space.md },
  searchSpinner: { paddingVertical: space.lg },
  updated: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -space.sm,
    alignSelf: "flex-start",
    minHeight: 24,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: FONT.display,
    color: colors.text,
  },
  edit: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FONT.regular,
    color: colors.textMuted,
  },
  filterScroll: { marginHorizontal: -space.lg },
  filters: { gap: space.sm, paddingHorizontal: space.lg },
  filter: {
    paddingHorizontal: space.md + 2,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  filterOn: { backgroundColor: colors.accent },
  filterText: { fontSize: 15, fontFamily: FONT.regular, color: colors.text },
  filterTextOn: { color: colors.onAccent },
  state: { alignItems: "center", gap: space.sm, paddingVertical: space.xxl },
  empty: { paddingVertical: space.lg },
  lead: {
    borderRadius: radius.lg - 6,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  leadImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceRaised,
  },
  leadText: { padding: space.lg, gap: 6 },
  leadTitle: {
    fontSize: 25,
    lineHeight: 30,
    fontFamily: FONT.display,
    color: colors.text,
  },
  summary: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FONT.light,
    color: colors.textMuted,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT.regular,
    color: colors.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 6 },
  rowTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: FONT.regular,
    color: colors.text,
  },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  prompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md + 4,
    backgroundColor: colors.surface,
    marginTop: space.lg,
  },
});
