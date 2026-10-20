// Which feeds to read: for a followed node or entity, for each feed mode
// (For you, Following, Top, Breaking, Trending, Digest), in your editions and
// languages, without blocked or (if you choose) paywalled sources.

import { countryByCode } from './countries';
import { entityKey, entityQuery, languagesOf, type FollowedEntity, type NewsPrefs } from './newsPrefs';
import { EDITIONS, F, gnews, gnewsSection, gnewsTop, guardian, sourceForFeed } from './sources';
import { CATEGORIES, categoryOf, isCategory, nodeById, type NewsNode } from './taxonomy';

export interface FeedRef {
  url: string;
  /** What it's for: a node id, an entity key, or a mode ("top"). */
  follow: string;
}

export type FeedMode = 'foryou' | 'following' | 'top' | 'breaking' | 'trending' | 'digest';

export const FEED_MODES: { id: FeedMode; title: string }[] = [
  { id: 'foryou', title: 'For you' },
  { id: 'following', title: 'Following' },
  { id: 'top', title: 'Top stories' },
  { id: 'breaking', title: 'Breaking' },
  { id: 'trending', title: 'Trending' },
  { id: 'digest', title: 'Daily digest' },
];

/** Is a publisher feed allowed by your languages, blocked sources and paywall choice? */
export function feedAllowed(url: string, prefs: NewsPrefs): boolean {
  const s = sourceForFeed(url);
  if (!s || s.kind === 'aggregator') return true;
  // Blocking a publisher blocks its other services too ("bbc" also blocks BBC Mundo and its podcast).
  if (prefs.blockedSources.some((b) => b === s.id || s.id.startsWith(`${b}-`) || b === s.name)) return false;
  if (s.paywall && !prefs.showPaywalled) return false;
  return languagesOf(prefs).includes(s.language);
}

/** Your place in a local search: {city}, {region} and {country}, each falling back to the wider one. */
export function resolveLocal(q: string, prefs: NewsPrefs): string {
  const country = countryByCode(prefs.country)?.name ?? EDITIONS.find((e) => e.id === prefs.editions[0])?.country ?? '';
  const region = prefs.region.trim() || country;
  const city = prefs.city.trim() || region;
  const quote = (s: string) => (s.includes(' ') ? `"${s}"` : s);
  return q.replace(/\{city\}/g, quote(city)).replace(/\{region\}/g, quote(region)).replace(/\{country\}/g, quote(country));
}

/** The edition for local news: the one for your country if there is one, else your main edition. */
function localEdition(prefs: NewsPrefs): string {
  const langs = languagesOf(prefs);
  return (EDITIONS.find((e) => e.country === prefs.country && langs.includes(e.language)) ?? EDITIONS.find((e) => e.country === prefs.country))?.id ?? prefs.editions[0];
}

/**
 * Every feed for one node, best first: its own publishers (in your
 * languages), then searches. A category also reads its Google News section in
 * each edition, its native-language publishers, and the first publisher of
 * each sub-topic. Never empty: the Google News search is always there.
 */
export function feedsForNode(node: NewsNode, prefs: NewsPrefs, muted: string[] = []): string[] {
  const out: string[] = [];
  const add = (url: string | undefined) => url && !out.includes(url) && feedAllowed(url, prefs) && out.push(url);
  const [main, ...others] = prefs.editions;
  const langs = languagesOf(prefs);

  node.feeds.forEach(add);

  if (node.local) {
    add(gnews(resolveLocal(node.q, prefs), localEdition(prefs)));
    const cat = categoryOf(node.id);
    if (node.depth === 1 && cat?.section) add(gnewsSection(cat.section, localEdition(prefs)));
    return out;
  }

  if (isCategory(node)) {
    for (const lang of langs) (node.native[lang] ?? []).forEach(add);
    if (node.section) prefs.editions.forEach((ed) => add(gnewsSection(node.section!, ed)));
  }

  add(gnews(node.q, main));
  // Names read the same in every language, so they're searched in every edition.
  if (node.name || node.depth === 1) others.forEach((ed) => add(gnews(node.q, ed)));

  // A followed category or topic also reads its sub-topics' publishers.
  for (const child of node.children) {
    if (muted.includes(child.id)) continue;
    child.feeds.slice(0, 1).forEach(add);
  }
  return out;
}

/** Feeds for an entity: a search in each edition (a country also reads its Guardian page). */
export function feedsForEntity(e: FollowedEntity, prefs: NewsPrefs): string[] {
  const out: string[] = [];
  if (e.kind === 'country') {
    const c = countryByCode(e.name);
    if (c?.guardian) out.push(guardian(c.guardian));
  }
  const q = e.kind === 'city' ? `"${e.name.trim()}"` : entityQuery(e);
  for (const ed of prefs.editions) out.push(gnews(q, ed));
  return out.filter((u) => feedAllowed(u, prefs));
}

const host = (url: string) => url.replace(/^https?:\/\/(www\.|feeds\.|rss\.)?/, '').split('/')[0];

/**
 * Feeds for several follows, up to `max`: one per follow first, so every
 * interest shows up, then more per follow, the least-used publisher first so
 * no one source takes over.
 */
export function roundRobin(lists: { follow: string; urls: string[] }[], max: number): FeedRef[] {
  const out: FeedRef[] = [];
  const seen = new Set<string>();
  const uses = new Map<string, number>();
  const longest = Math.max(0, ...lists.map((l) => l.urls.length));
  for (let round = 0; round < longest && out.length < max; round++) {
    for (const l of lists) {
      if (out.length >= max) break;
      const options = l.urls.filter((u) => !seen.has(u));
      if (options.length === 0) continue;
      const pick = options.reduce((best, u) => ((uses.get(host(u)) ?? 0) < (uses.get(host(best)) ?? 0) ? u : best));
      seen.add(pick);
      uses.set(host(pick), (uses.get(host(pick)) ?? 0) + 1);
      out.push({ url: pick, follow: l.follow });
    }
  }
  return out;
}

/** Your follows' feeds. */
export function followFeeds(follows: string[], prefs: NewsPrefs, max = 30): FeedRef[] {
  const lists = [
    ...follows.flatMap((id) => {
      const n = nodeById(id);
      return n ? [{ follow: id, urls: feedsForNode(n, prefs, prefs.muted) }] : [];
    }),
    ...prefs.entities.map((e) => ({ follow: entityKey(e), urls: feedsForEntity(e, prefs) })),
  ];
  return roundRobin(lists, max);
}

/** The big stories everyone's reading: Google News top stories in each edition, and the main broadcasters. */
export function topFeeds(prefs: NewsPrefs): FeedRef[] {
  const world = CATEGORIES.find((c) => c.id === 'world')!;
  const urls = [...prefs.editions.map((ed) => gnewsTop(ed)), ...feedsForNode(world, prefs).filter((u) => !u.includes('news.google.com')).slice(0, 10)];
  return urls.filter((u) => feedAllowed(u, prefs)).map((url) => ({ url, follow: 'top' }));
}

/** Fast-moving sources for Breaking: wire-style broadcasters and Google News top stories. */
export function breakingFeeds(prefs: NewsPrefs): FeedRef[] {
  const fast = [F.sky, B_WORLD, F.abc, F.cbs, F.france24, F.dw, F.aljazeera, F.euronews, F.france24fr, F.francetvinfo, F.tagesschau, F.ansa, F.nhk, F.g1];
  return [...prefs.editions.map((ed) => gnewsTop(ed)), ...fast]
    .filter((u, i, all) => all.indexOf(u) === i && feedAllowed(u, prefs))
    .map((url) => ({ url, follow: 'breaking' }));
}
const B_WORLD = 'https://feeds.bbci.co.uk/news/world/rss.xml';

/** Trending: top stories plus what's going viral. */
export function trendingFeeds(prefs: NewsPrefs): FeedRef[] {
  const viral = nodeById('trending')!;
  return [...topFeeds(prefs), ...feedsForNode(viral, prefs).slice(0, 6).map((url) => ({ url, follow: 'trending' }))];
}

/** The feeds a mode reads. */
export function feedsForMode(mode: FeedMode, follows: string[], prefs: NewsPrefs): FeedRef[] {
  switch (mode) {
    case 'following':
      return followFeeds(follows, prefs);
    case 'foryou':
    case 'digest':
      // Your follows, plus a few top stories so big news always reaches you.
      return [...followFeeds(follows, prefs, 26), ...topFeeds(prefs).slice(0, 4)];
    case 'top':
      return topFeeds(prefs);
    case 'breaking':
      return breakingFeeds(prefs);
    case 'trending':
      return trendingFeeds(prefs);
  }
}

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 24 * 60 * 60_000;

/** The search for a follow, for going back in time. */
export function followQuery(follow: string, prefs: NewsPrefs): string | null {
  if (follow.startsWith('entity:')) {
    const e = prefs.entities.find((x) => entityKey(x) === follow);
    return e ? entityQuery(e) : null;
  }
  const n = nodeById(follow);
  if (!n) return null;
  return n.local ? resolveLocal(n.q, prefs) : n.q;
}

/** Google News for a search in a window of days: how a feed goes back in time as you scroll. */
export function olderUrl(query: string, before: number, days: number, edition: string): string {
  return gnews(`${query} before:${ymd(before)} after:${ymd(before - days * DAY)}`, edition);
}
