import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { filterArticles, timeAgo, type Article, type ArticleFormat } from "@/core/news";
import { FEED_MODES, type FeedMode } from "@/core/newsFeeds";
import { STORY_SORTS, sortStories, type Story, type StorySort } from "@/core/stories";
import { openInAppBrowser, searchNews } from "@/services/news";
import { useStore } from "@/state/store";
import { onNearBottom } from "@/state/nearBottom";
import { useNews } from "@/state/useNews";
import { useNow } from "@/state/useNow";
import { FONT, colors, radius, space } from "@/theme";
import { PressableScale, Segmented, Txt } from "./ui";

/** Tapping a story opens the article itself, on its publisher's page, inside Ryz (Safari Reader on iPhone). */
function openArticle(a: Article) {
  openInAppBrowser(a.url);
}

/** Holding a story shows its card: summary, tags, follow or mute its topic, block its source, other coverage. */
function openCard(a: Article) {
  router.push({
    pathname: "/article",
    params: { url: a.url, title: a.title, image: a.image ?? "", source: a.source, summary: a.summary, published: String(a.published) },
  });
}

/** Every publisher covering the story, as a timeline. */
function openStory(story: Story) {
  router.push({ pathname: "/story/[id]", params: { id: story.id, q: story.query, title: story.lead.title } });
}

/** "Also in 4 more ›": opens the story's page, separately from the article. */
function MoreSources({ story }: { story: Story }) {
  if (story.sources.length < 2) return null;
  const n = story.sources.length - 1;
  return (
    <Pressable onPress={() => openStory(story)} hitSlop={8} accessibilityRole="link" accessibilityLabel={`See ${n} more ${n === 1 ? "source" : "sources"} for this story`} style={styles.moreSources}>
      <Text style={styles.moreSourcesText}>{`Also in ${n} more ${n === 1 ? "source" : "sources"} ›`}</Text>
    </Pressable>
  );
}

const FORMAT_BADGE: Partial<Record<ArticleFormat, string>> = {
  video: "Video",
  audio: "Audio",
  live: "● Live",
  gallery: "Photos",
  longread: "Long read",
};

function Meta({ article, now }: { article: Article; now: number }) {
  const badge = article.tags ? FORMAT_BADGE[article.tags.format] : undefined;
  return (
    <Text style={styles.meta} numberOfLines={1}>
      {badge ? <Text style={article.tags?.format === "live" ? styles.live : styles.badge}>{`${badge} · `}</Text> : null}
      {`${article.source} · ${timeAgo(article.published, now)}${article.paywall ? " · Paywall" : ""}`}
    </Text>
  );
}

const Lead = memo(function Lead({ story, now }: { story: Story; now: number }) {
  const article = story.lead;
  return (
    <PressableScale
      onPress={() => openArticle(article)}
      onLongPress={() => openCard(article)}
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
        <MoreSources story={story} />
      </View>
    </PressableScale>
  );
});

const Row = memo(function Row({ story, now, rank }: { story: Story; now: number; rank?: number }) {
  const article = story.lead;
  return (
    <Pressable
      onPress={() => openArticle(article)}
      onLongPress={() => openCard(article)}
      accessibilityRole="button"
      accessibilityHint="Opens the article. Hold for more options."
      accessibilityLabel={`${article.title}. ${article.source}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {rank ? <Text style={styles.rank}>{rank}</Text> : null}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={3}>
          {article.title}
        </Text>
        {rank && article.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {article.summary}
          </Text>
        ) : null}
        <Meta article={article} now={now} />
        <MoreSources story={story} />
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
});

const single = (a: Article): Story => ({ id: a.id, lead: a, articles: [a], sources: [a.source], first: a.published, last: a.published, query: a.title, hub: false });

/** Stories added each time you reach the end. */
const PAGE = 15;

type WebResults = {
  query: string;
  status: "loading" | "ready" | "error";
  articles: Article[];
};

/** Searches every publisher a moment after typing stops. */
function useWebSearch(query: string, edition: string): WebResults | null {
  const q = query.trim();
  const [results, setResults] = useState<WebResults | null>(null);
  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setResults({ query: q, status: "loading", articles: [] });
      searchNews(q, edition)
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
  }, [q, edition]);
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
  const { data } = useStore();
  const web = useWebSearch(query, data.settings.news.editions[0]);
  const ids = new Set(mine.map((a) => a.title.toLowerCase()));
  const others = (web?.articles ?? []).filter(
    (a) => !ids.has(a.title.toLowerCase()),
  );
  return (
    <>
      {mine.length > 0 ? <Txt variant="label">In your news</Txt> : null}
      {mine.slice(0, 10).map((a) => (
        <Row key={a.id} story={single(a)} now={now} />
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
        others.map((a) => <Row key={a.id} story={single(a)} now={now} />)
      )}
    </>
  );
}

const FORMATS: { id: ArticleFormat | "all"; title: string }[] = [
  { id: "all", title: "All" },
  { id: "article", title: "Articles" },
  { id: "video", title: "Videos" },
  { id: "audio", title: "Podcasts" },
  { id: "live", title: "Live" },
  { id: "gallery", title: "Photos" },
  { id: "longread", title: "Long reads" },
  { id: "brief", title: "Briefs" },
];

function ChipRow<T extends string>({ items, value, onChange, small }: { items: { id: T; title: string }[]; value: T; onChange: (v: T) => void; small?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
      {items.map((it) => {
        const on = value === it.id;
        return (
          <Pressable key={it.id} onPress={() => onChange(it.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.filter, small && styles.filterSmall, on && styles.filterOn]}>
            <Text style={[styles.filterText, small && styles.filterTextSmall, on && styles.filterTextOn]}>{it.title}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const EMPTY: Record<FeedMode, string> = {
  foryou: "Nothing new here yet.",
  following: "Nothing new from what you follow yet.",
  top: "No top stories right now.",
  breaking: "No breaking news in the last few hours.",
  trending: "Nothing is trending right now.",
  digest: "Your digest fills up as the day’s news comes in.",
};

/** "Your news" on Morning: feed modes (For you, Following, Top, Breaking, Trending, Digest), formats, a search, then stories. Memoized: Morning redraws for its clock, the feed only when its follows change. */
export const NewsFeed = memo(function NewsFeed({ follows }: { follows: string[] }) {
  const [mode, setMode] = useState<FeedMode>("foryou");
  const [format, setFormat] = useState<ArticleFormat | "all">("all");
  // Newest first unless you pick another order.
  const [sort, setSort] = useState<StorySort>("newest");
  const { stories: modeStories, articles, status, refresh, refreshing, updatedAt, loadOlder, olderStatus, scrollsBack } = useNews(mode, follows, format);
  const digest = mode === "digest";
  // The digest is a ranking of the day; every other mode can be re-sorted.
  const stories = useMemo(() => (digest ? modeStories : sortStories(modeStories, sort)), [digest, modeStories, sort]);
  const [query, setQuery] = useState("");
  // Stories on screen; scrolling near the end shows more, then fetches older ones.
  const [visible, setVisible] = useState(PAGE);
  const searching = query.trim().length > 0;
  const now = useNow(60_000);
  const [lead, ...rest] = stories;
  const moreHere = rest.length > visible;

  const latest = useRef({ moreHere, searching, loadOlder, scrollsBack });
  useLayoutEffect(() => {
    latest.current = { moreHere, searching, loadOlder, scrollsBack };
  });
  useEffect(
    () =>
      onNearBottom(() => {
        const l = latest.current;
        if (l.searching) return;
        setVisible((v) => v + PAGE);
        if (!l.moreHere && l.scrollsBack) l.loadOlder();
      }),
    [],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Txt style={styles.title} accessibilityRole="header">
          Your news
        </Txt>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/news-settings")} hitSlop={10} accessibilityRole="button" accessibilityLabel="News settings">
            <Ionicons name="options-outline" size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => router.push("/interests")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit what you follow">
            <Txt style={styles.edit}>Edit</Txt>
          </Pressable>
        </View>
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
          <ChipRow
            items={FEED_MODES}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setVisible(PAGE);
            }}
          />
          {digest ? null : (
            <Segmented
              label="Sort stories"
              options={STORY_SORTS.map((o) => ({ value: o.id, label: o.title }))}
              value={sort}
              onChange={(v) => {
                setSort(v);
                setVisible(PAGE);
              }}
            />
          )}
          <ChipRow
            small
            items={FORMATS}
            value={format}
            onChange={(f) => {
              setFormat(f);
              setVisible(PAGE);
            }}
          />

          {status === "loading" && stories.length === 0 ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : status === "error" && stories.length === 0 ? (
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
          ) : digest ? (
            <>
              <Txt variant="muted">{`The day’s ${stories.length} biggest stories from what you follow, ${new Date(now).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}.`}</Txt>
              {stories.length === 0 ? <Txt variant="muted" style={styles.empty}>{EMPTY.digest}</Txt> : null}
              {stories.map((st, i) => (
                <Row key={st.id} story={st} now={now} rank={i + 1} />
              ))}
            </>
          ) : (
            <>
              {lead ? (
                <Lead story={lead} now={now} />
              ) : (
                <Txt variant="muted" style={styles.empty}>
                  {format === "all" ? EMPTY[mode] : "Nothing in this format right now."}
                </Txt>
              )}
              {rest.slice(0, visible).map((st) => (
                <Row key={st.id} story={st} now={now} />
              ))}
              {lead ? (
                <View style={styles.more}>
                  {olderStatus === "loading" ? (
                    <>
                      <ActivityIndicator color={colors.textMuted} />
                      <Txt variant="caption">Loading older news…</Txt>
                    </>
                  ) : (olderStatus === "done" || !scrollsBack) && !moreHere ? (
                    <Txt variant="caption">{scrollsBack ? "That's all the older news for now." : "That's everything for now."}</Txt>
                  ) : olderStatus === "error" && !moreHere ? (
                    <Pressable onPress={loadOlder} hitSlop={8} accessibilityRole="button">
                      <Txt variant="caption">{"Couldn't load older news. Tap to try again."}</Txt>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setVisible((v) => v + PAGE);
                        if (!moreHere && scrollsBack) loadOlder();
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
});

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
          Follow what you like: 31 categories, 850 topics, teams, people and more.
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: space.lg },
  filterSmall: { height: 28, paddingHorizontal: space.md, backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  filterTextSmall: { fontSize: 13 },
  badge: { color: colors.text, fontFamily: FONT.medium },
  live: { color: colors.danger, fontFamily: FONT.medium },
  moreSources: { alignSelf: "flex-start" },
  moreSourcesText: { fontSize: 13, lineHeight: 18, fontFamily: FONT.medium, color: colors.text },
  rank: { fontSize: 28, lineHeight: 32, fontFamily: FONT.display, color: colors.textFaint, width: 30, alignSelf: "flex-start" },
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
