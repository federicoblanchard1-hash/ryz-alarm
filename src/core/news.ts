// News parsing: RSS 2.0 and Atom feeds, Google News searches, and mixing
// feeds evenly. What to read comes from taxonomy.ts and newsFeeds.ts; which
// publisher a feed is, in which language and country, from sources.ts.
//
// Ryz shows a story's headline, a short summary, its picture and a link to
// the publisher. It never copies the full text: the story itself is read on
// the publisher's site.

import { PAYWALLED_PUBLISHERS, sourceForFeed } from './sources';

// ---- Text helpers

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', pound: '£', euro: '€' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Plain text from a bit of HTML: tags dropped, entities decoded, spaces tidied. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/<!\[CDATA\[|\]\]>/g, ''),
  )
    .replace(/[ \t\r\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

// ---- RSS

export type ArticleFormat = 'article' | 'video' | 'audio' | 'live' | 'gallery' | 'longread' | 'brief';

export interface ArticleTags {
  /** Category ids, e.g. "sports". A story can be in several. */
  categories: string[];
  /** Taxonomy node ids at any level, e.g. "sports.football.premier-league". */
  topics: string[];
  /** World region ids. */
  regions: string[];
  /** ISO country codes the story is about or from. */
  countries: string[];
  language: string;
  /** People, teams, companies, places and tickers named in it. */
  entities: string[];
  format: ArticleFormat;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  image?: string;
  source: string;
  /** ms */
  published: number;
  /** The follow (node id, entity key or mode) whose feed it came from. */
  topic: string;
  /** The source registry entry, when the feed is a known publisher. */
  sourceId?: string;
  language?: string;
  country?: string;
  paywall?: boolean;
  /** Video or podcast: where to play it. */
  media?: { kind: 'video' | 'audio'; url?: string };
  tags?: ArticleTags;
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1') : undefined;
}

function attr(element: string, name: string): string | undefined {
  const m = element.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return m ? decodeEntities(m[1]) : undefined;
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** The biggest picture an item offers. BBC lists a 240 px thumbnail; its CDN serves the same picture wider. */
function bestImage(item: string): string | undefined {
  const candidates = [...item.matchAll(/<(media:content|media:thumbnail|enclosure)\b[^>]*>/gi)]
    .map((m) => ({ url: attr(m[0], 'url'), width: Number(attr(m[0], 'width') ?? 0), type: attr(m[0], 'type') ?? '' }))
    .filter((c) => c.url && (!c.type || c.type.startsWith('image')));
  if (candidates.length === 0) {
    const img = item.match(/<img[^>]+src="([^"]+)"/i);
    return img ? decodeEntities(img[1]) : undefined;
  }
  const best = candidates.sort((a, b) => b.width - a.width)[0].url!;
  return best.replace(/\/ace\/standard\/\d+\//, '/ace/standard/800/');
}

/** An Atom entry's page: the alternate link, or the first one. */
function atomLink(entry: string): string | undefined {
  const links = [...entry.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const page = links.find((l) => /rel="alternate"/i.test(l)) ?? links.find((l) => !/rel=/i.test(l)) ?? links[0];
  return page ? attr(page, 'href') : undefined;
}

/** A podcast episode or video in an item. */
function mediaOf(item: string, link: string): Article['media'] {
  const enclosure = [...item.matchAll(/<(enclosure|media:content)\b[^>]*>/gi)].map((m) => m[0]).find((e) => /type="(audio|video)\//i.test(e));
  if (enclosure) return { kind: /type="audio/i.test(enclosure) ? 'audio' : 'video', url: attr(enclosure, 'url') };
  if (/youtube\.com\/watch|youtu\.be\//.test(link) || /<yt:videoId>/.test(item)) return { kind: 'video', url: link };
  return undefined;
}

/** Articles in an RSS 2.0 or Atom feed, newest first, each marked with its publisher from the source registry. */
export function parseFeed(xml: string, topic: string, feedUrl?: string): Article[] {
  const atom = !/<item\b/i.test(xml) && /<entry\b/i.test(xml);
  const items = (atom ? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) : xml.match(/<item\b[\s\S]*?<\/item>/gi)) ?? [];
  const src = feedUrl ? sourceForFeed(feedUrl) : null;
  const out: Article[] = [];
  for (const item of items) {
    const title = htmlToText(decodeEntities(tag(item, 'title') ?? ''));
    const link = atom ? atomLink(item) : tag(item, 'link');
    const url = htmlToText(link ?? '').replace(/\?at_medium=RSS.*$/, '');
    if (!title || !url.startsWith('http')) continue;
    const published = Date.parse(htmlToText(tag(item, 'pubDate') ?? tag(item, 'dc:date') ?? tag(item, 'published') ?? tag(item, 'updated') ?? '')) || 0;
    const summary = htmlToText(decodeEntities(tag(item, 'description') ?? tag(item, 'summary') ?? tag(item, 'media:description') ?? tag(item, 'content') ?? '').replace(/<\/p>/gi, '\n'))
      .replace(/\s*Continue reading\.*\s*$/i, '')
      .split('\n')[0]
      .slice(0, 280);
    const thumb = item.match(/<media:thumbnail\b[^>]*>/i);
    // The feed's publisher, or the one the story's own address belongs to.
    const byUrl = src && src.kind !== 'aggregator' ? null : sourceForFeed(url);
    const s = byUrl && byUrl.kind !== 'aggregator' ? byUrl : (src ?? byUrl);
    // Video titles often end with the channel: "… | BBC News".
    const name = s && s.kind !== 'aggregator' ? s.name : '';
    const firstWord = name.split(/[\s(]/)[0].toLowerCase();
    const clean = firstWord ? title.replace(/\s+[|–-]\s+([^|–-]{2,40})$/, (m, tail: string) => (tail.toLowerCase().includes(firstWord) ? '' : m)) : title;
    out.push({
      id: url,
      title: clean,
      summary,
      url,
      image: bestImage(item) ?? (thumb ? attr(thumb[0], 'url') : undefined),
      source: s && s.kind !== 'aggregator' ? s.name : hostName(url),
      published,
      topic,
      sourceId: s?.id,
      language: s?.language,
      country: s?.country,
      paywall: s?.paywall,
      media: mediaOf(item, url) ?? (s?.kind === 'podcast' ? { kind: 'audio' } : s?.kind === 'video' ? { kind: 'video', url } : undefined),
    });
  }
  return out.sort((a, b) => b.published - a.published);
}


/** Stories are mixed between sources within slices of this length, newest slice first. */
const SLICE_MS = 12 * 60 * 60_000;

/**
 * Feeds merged without the same story twice, going back in time: stories
 * are grouped into 12-hour slices, newest first, and within a slice the
 * feeds take turns, so one busy feed (BBC Football posts 80 stories a day)
 * can't crowd out the others and scrolling down means going back in time.
 */
export function mergeArticles(lists: Article[][], limit = 300): Article[] {
  const newest = Math.max(0, ...lists.flat().map((a) => a.published));
  const seen = new Set<string>();
  // Each feed's stories by slice, deduplicated, newest first.
  const slices = new Map<number, Article[][]>();
  lists.forEach((list, feed) => {
    for (const a of [...list].sort((x, y) => y.published - x.published)) {
      const key = a.title.toLowerCase().replace(/\W+/g, ' ').trim();
      if (seen.has(a.url) || seen.has(key)) continue;
      seen.add(a.url);
      seen.add(key);
      const slice = a.published ? Math.floor((newest - a.published) / SLICE_MS) : Number.MAX_SAFE_INTEGER;
      const bucket = slices.get(slice) ?? lists.map(() => []);
      bucket[feed].push(a);
      slices.set(slice, bucket);
    }
  });
  const out: Article[] = [];
  for (const slice of [...slices.keys()].sort((x, y) => x - y)) {
    // Within a slice, the feed with the freshest story goes first in each turn.
    const pools = slices.get(slice)!.filter((p) => p.length > 0).sort((x, y) => y[0].published - x[0].published);
    const longest = Math.max(...pools.map((p) => p.length));
    for (let i = 0; i < longest; i++) {
      for (const pool of pools) {
        if (pool[i]) out.push(pool[i]);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

// ---- Search (Google News): every publisher, for anything.

/** Google News titles end in " - Publisher"; the publisher goes in `source`, and the edition gives the language. */
export function parseSearch(xml: string, topic = 'search', feedUrl?: string): Article[] {
  return parseFeed(xml, topic, feedUrl).map((a) => {
    const m = a.title.match(/^(.*) - ([^-]+)$/);
    const source = m ? m[2].trim() : a.source;
    return { ...a, title: m ? m[1] : a.title, source, sourceId: undefined, summary: '', paywall: PAYWALLED_PUBLISHERS.has(source) };
  });
}

/** Stories you already have that match the words typed, every word anywhere in the title or summary. */
export function filterArticles(list: Article[], query: string): Article[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return list;
  return list.filter((a) => {
    const text = `${a.title} ${a.summary} ${a.source}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

// ---- Formatting

export function timeAgo(ms: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - ms) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
