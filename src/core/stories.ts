// Stories: the same news from several publishers grouped together (one card,
// every source listed), your filters applied, and the order for each feed
// mode: For you, Following, Top stories, Breaking, Trending and the Daily
// digest.

import type { Article, ArticleFormat } from './news';
import { followState, languagesOf, type NewsPrefs } from './newsPrefs';
import type { FeedMode } from './newsFeeds';
import { sourceForFeed, SOURCES } from './sources';

export interface Story {
  /** Stable while the story runs: built from its main words. */
  id: string;
  lead: Article;
  articles: Article[];
  /** Publisher names, lead first. */
  sources: string[];
  first: number;
  last: number;
  /** A search for the story, for its page and to go back in time. */
  query: string;
  /** Covered widely enough to have its own page. */
  hub: boolean;
}

const STOP = new Set(
  'the a an and or but of to in on at for from by with as is are was were be been has have had it its this that these those after before over under into about amid against says say said will would could can may new more most than up down out off not no yes live watch video photos what why how who when where which while during his her their our your you we they he she them him us de la le les des du et en un une el los las y del al di il della e der die das und von zu mit im für auf den dem ist'.split(
    ' ',
  ),
);

/** A headline's main words. */
export function titleTokens(title: string): string[] {
  return [
    ...new Set(
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['’]s\b/g, '')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !STOP.has(w)),
    ),
  ];
}

const HOURS_48 = 48 * 60 * 60_000;

function similar(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const B = new Set(b);
  const shared = a.filter((w) => B.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return (shared >= 2 && shared / union >= 0.4) || shared >= 4 || (shared >= 3 && shared / Math.min(a.length, b.length) >= 0.6);
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** The best story to lead with: a picture, a summary, a preferred source. */
function pickLead(list: Article[], preferred: string[]): Article {
  const score = (a: Article) => (a.image ? 2 : 0) + (a.summary ? 1 : 0) + (isPreferred(a, preferred) ? 3 : 0) - (a.paywall ? 0.5 : 0);
  return [...list].sort((x, y) => score(y) - score(x) || y.published - x.published)[0];
}

/**
 * Groups the same news from different publishers into stories. Articles are
 * compared by headline words, within two days of each other. Keeps the input
 * order: a story sits where its first article was.
 */
export function clusterArticles(list: Article[], preferred: string[] = []): Story[] {
  const groups: { tokens: string[][]; articles: Article[] }[] = [];
  for (const a of list) {
    const tokens = titleTokens(a.title);
    const home = groups.find((g) => g.articles.some((b) => Math.abs((b.published || 0) - (a.published || 0)) < HOURS_48) && g.tokens.slice(0, 6).some((t) => similar(tokens, t)));
    if (home) {
      if (home.articles.some((b) => b.url === a.url)) continue;
      home.tokens.push(tokens);
      home.articles.push(a);
    } else groups.push({ tokens: [tokens], articles: [a] });
  }
  // A later article can bridge two groups that started apart: join them.
  const near = (x: (typeof groups)[number], y: (typeof groups)[number]) =>
    x.articles.some((a) => y.articles.some((b) => Math.abs((a.published || 0) - (b.published || 0)) < HOURS_48)) && x.tokens.slice(0, 3).some((t) => y.tokens.slice(0, 3).some((u) => similar(t, u)));
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      if (!near(groups[i], groups[j])) continue;
      const urls = new Set(groups[i].articles.map((a) => a.url));
      groups[j].articles.forEach((a, k) => {
        if (urls.has(a.url)) return;
        groups[i].articles.push(a);
        groups[i].tokens.push(groups[j].tokens[k]);
      });
      groups.splice(j, 1);
      j = i;
    }
  }
  return groups.map((g) => {
    const lead = pickLead(g.articles, preferred);
    const counts = new Map<string, number>();
    g.tokens.flat().forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
    const key = titleTokens(lead.title)
      .sort((x, y) => (counts.get(y) ?? 0) - (counts.get(x) ?? 0) || x.localeCompare(y))
      .slice(0, 4);
    const sources = [...new Set([lead.source, ...g.articles.map((a) => a.source)].filter(Boolean))];
    const times = g.articles.map((a) => a.published).filter(Boolean);
    return {
      id: hash([...key].sort().join(' ')),
      lead,
      articles: g.articles,
      sources,
      first: times.length ? Math.min(...times) : 0,
      last: times.length ? Math.max(...times) : 0,
      query: key.join(' '),
      hub: sources.length >= 3,
    };
  });
}

// ---- Filters

function sourceKeys(a: Article): string[] {
  const keys = [a.source.toLowerCase()];
  if (a.sourceId) keys.push(a.sourceId.toLowerCase());
  return keys;
}

const listed = (a: Article, list: string[]) => {
  const keys = sourceKeys(a);
  return list.some((s) => keys.includes(s.toLowerCase()) || keys.includes((SOURCES.find((x) => x.id === s)?.name ?? '').toLowerCase()));
};

export const isPreferred = (a: Article, preferred: string[]) => preferred.length > 0 && listed(a, preferred);

/** Is a story with these topics muted? The deepest topic with a choice decides; a mute wins a tie. */
export function mutedByTags(topics: string[], follows: string[], muted: string[]): boolean {
  let depth = 0;
  let mutedHere = false;
  for (const id of topics) {
    const s = followState(id, follows, muted);
    if (!s) continue;
    const d = id.split('.').length;
    const isMuted = s === 'muted' || s === 'muted-above';
    if (d > depth) {
      depth = d;
      mutedHere = isMuted;
    } else if (d === depth && isMuted) mutedHere = true;
  }
  return mutedHere;
}

export interface FilterOptions {
  prefs: NewsPrefs;
  follows: string[];
  format?: ArticleFormat | 'all';
}

/** Your filters: languages, regions, blocked sources, paywalls, muted topics and words, and a format. */
export function applyFilters(list: Article[], { prefs, follows, format = 'all' }: FilterOptions): Article[] {
  const langs = languagesOf(prefs);
  const words = prefs.mutedKeywords.map((w) => w.trim().toLowerCase()).filter(Boolean);
  return list.filter((a) => {
    const tags = a.tags;
    if (tags && !langs.includes(tags.language)) return false;
    if (prefs.regions.length && tags && tags.regions.length && !tags.regions.some((r) => prefs.regions.includes(r as never))) return false;
    if (prefs.blockedSources.length && listed(a, prefs.blockedSources)) return false;
    if (!prefs.showPaywalled && a.paywall) return false;
    if (words.length) {
      const text = `${a.title} ${a.summary}`.toLowerCase();
      if (words.some((w) => text.includes(w))) return false;
    }
    // The most specific choice wins: mute Football but follow Football › Transfers, and transfer stories stay.
    if (tags && prefs.muted.length && mutedByTags(tags.topics, follows, prefs.muted)) return false;
    if (format !== 'all' && tags && tags.format !== format) return false;
    return true;
  });
}

// ---- Feed modes

const HOUR = 60 * 60_000;

/** How much a story matters right now: more sources and fresher is higher. */
function heat(s: Story, now: number): number {
  const ageH = Math.max(0, (now - s.last) / HOUR);
  return Math.log2(1 + s.sources.length) * 2 + Math.max(0, 6 - ageH / 4);
}

/** Your stories in the order for a mode. */
export function orderStories(mode: FeedMode, stories: Story[], prefs: NewsPrefs, follows: string[], now: number): Story[] {
  const affinity = (s: Story) => {
    const tags = s.articles.flatMap((a) => a.tags?.topics ?? []);
    const matches = follows.filter((f) => tags.includes(f)).length + s.articles.filter((a) => a.topic.startsWith('entity:')).length;
    return Math.min(3, matches) + (s.articles.some((a) => isPreferred(a, prefs.preferredSources)) ? 1.5 : 0);
  };
  switch (mode) {
    case 'following':
      // As they came in: feeds already take turns within each 12-hour slice.
      return stories;
    case 'foryou':
      return [...stories].sort((a, b) => heat(b, now) + affinity(b) * 1.5 - (heat(a, now) + affinity(a) * 1.5));
    case 'top':
      return [...stories].sort((a, b) => heat(b, now) - heat(a, now));
    case 'breaking':
      return stories.filter((s) => now - s.last < 3 * HOUR || s.lead.tags?.format === 'live').sort((a, b) => b.last - a.last);
    case 'trending': {
      // Picking up speed: many sources in a short time.
      const speed = (s: Story) => s.sources.length / Math.max(1, (now - s.first) / HOUR + 1);
      return stories.filter((s) => now - s.last < 24 * HOUR && s.sources.length >= 2).sort((a, b) => speed(b) - speed(a));
    }
    case 'digest': {
      // The day in a dozen stories: the biggest from the last day, no more than three per category.
      const perCat = new Map<string, number>();
      const out: Story[] = [];
      for (const s of [...stories].filter((x) => now - x.last < 24 * HOUR).sort((a, b) => heat(b, now) + affinity(b) - (heat(a, now) + affinity(a)))) {
        const cat = s.lead.tags?.categories[0] ?? 'other';
        if ((perCat.get(cat) ?? 0) >= 3) continue;
        perCat.set(cat, (perCat.get(cat) ?? 0) + 1);
        out.push(s);
        if (out.length >= 12) break;
      }
      return out;
    }
  }
}

/** Known publishers, for picking preferred and blocked sources. */
export function registrySources() {
  return SOURCES.filter((s) => s.kind !== 'aggregator').sort((a, b) => a.name.localeCompare(b.name));
}

export { sourceForFeed };
