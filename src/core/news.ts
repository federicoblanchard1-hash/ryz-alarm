// News for the Morning screen: the topics you can follow, an RSS parser, and a
// reader view that pulls an article's text out of its page so it can be shown
// in Ryz, without the site's pop-ups, cookie banners or sign-up walls.
//
// Each topic reads several publishers (BBC, The Guardian, NYT, Sky, France 24,
// Euronews, Wired, The Verge, ESPN, Autosport, Variety…), all free RSS feeds
// that were checked to return stories, and the feed mixes them evenly.

import { CATEGORIES, searchUrl, type Topic } from './newsCatalog';

export { CATEGORIES, TOPIC_RENAMES, migrateTopicIds, searchUrl, type Category, type Topic } from './newsCatalog';


const TOPICS = new Map(CATEGORIES.flatMap((c) => c.topics.map((t) => [t.id, t] as const)));

export function topicById(id: string): Topic | undefined {
  return TOPICS.get(id);
}

const host = (url: string) => url.replace(/^https?:\/\/(www\.|feeds\.|rss\.)?/, '').split('/')[0];

/**
 * The feeds to read for these topics, up to `max`: one per topic first, so
 * every interest shows up, then more publishers per topic. Within a round,
 * publishers used least so far come first, so no one source takes over.
 */
export function feedsFor(topicIds: string[], max = 24): { url: string; topic: string }[] {
  const chosen = topicIds.map(topicById).filter((t): t is Topic => Boolean(t));
  const out: { url: string; topic: string }[] = [];
  const seen = new Set<string>();
  const uses = new Map<string, number>();
  const longest = Math.max(0, ...chosen.map((t) => t.feeds.length));
  for (let round = 0; round < longest && out.length < max; round++) {
    // In each round, a topic may pick any feed it hasn't used yet; it takes the least-used publisher.
    for (const t of chosen) {
      if (out.length >= max) break;
      const options = t.feeds.filter((u) => !seen.has(u));
      if (options.length === 0) continue;
      const pick = options.reduce((best, u) => ((uses.get(host(u)) ?? 0) < (uses.get(host(best)) ?? 0) ? u : best));
      seen.add(pick);
      uses.set(host(pick), (uses.get(host(pick)) ?? 0) + 1);
      out.push({ url: pick, topic: t.id });
    }
  }
  return out;
}

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

export interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  image?: string;
  source: string;
  /** ms */
  published: number;
  topic: string;
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1') : undefined;
}

function attr(element: string, name: string): string | undefined {
  const m = element.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return m ? decodeEntities(m[1]) : undefined;
}

const SOURCES: [string, string][] = [
  ['bbc.', 'BBC'],
  ['theguardian.com', 'The Guardian'],
  ['arstechnica.com', 'Ars Technica'],
  ['nytimes.com', 'The New York Times'],
  ['news.sky.com', 'Sky News'],
  ['skysports.com', 'Sky Sports'],
  ['france24.com', 'France 24'],
  ['euronews.com', 'Euronews'],
  ['abcnews', 'ABC News'],
  ['aljazeera.com', 'Al Jazeera'],
  ['dw.com', 'DW'],
  ['lemonde.fr', 'Le Monde'],
  ['rts.ch', 'RTS'],
  ['letemps.ch', 'Le Temps'],
  ['theverge.com', 'The Verge'],
  ['wired.com', 'Wired'],
  ['engadget.com', 'Engadget'],
  ['techcrunch.com', 'TechCrunch'],
  ['9to5mac.com', '9to5Mac'],
  ['technologyreview.com', 'MIT Technology Review'],
  ['ign.com', 'IGN'],
  ['polygon.com', 'Polygon'],
  ['kotaku.com', 'Kotaku'],
  ['fortune.com', 'Fortune'],
  ['inc.com', 'Inc.'],
  ['fastcompany.com', 'Fast Company'],
  ['marketwatch.com', 'MarketWatch'],
  ['coindesk.com', 'CoinDesk'],
  ['sciencedaily.com', 'ScienceDaily'],
  ['phys.org', 'Phys.org'],
  ['livescience.com', 'Live Science'],
  ['smithsonianmag.com', 'Smithsonian'],
  ['nature.com', 'Nature'],
  ['space.com', 'Space.com'],
  ['nasa.gov', 'NASA'],
  ['psychologytoday.com', 'Psychology Today'],
  ['carbonbrief.org', 'Carbon Brief'],
  ['insideclimatenews.org', 'Inside Climate News'],
  ['runnersworld.com', "Runner's World"],
  ['menshealth.com', "Men's Health"],
  ['espn.', 'ESPN'],
  ['autosport.com', 'Autosport'],
  ['motorsport.com', 'Motorsport.com'],
  ['cyclingnews.com', 'Cyclingnews'],
  ['variety.com', 'Variety'],
  ['hollywoodreporter.com', 'The Hollywood Reporter'],
  ['pitchfork.com', 'Pitchfork'],
  ['rollingstone.com', 'Rolling Stone'],
  ['vogue.com', 'Vogue'],
  ['bonappetit.com', 'Bon Appétit'],
  ['dezeen.com', 'Dezeen'],
];

function sourceName(url: string): string {
  const known = SOURCES.find(([part]) => url.includes(part));
  if (known) return known[1];
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

/** Articles in an RSS 2.0 or Atom feed, newest first. */
export function parseFeed(xml: string, topic: string): Article[] {
  const atom = !/<item\b/i.test(xml) && /<entry\b/i.test(xml);
  const items = (atom ? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) : xml.match(/<item\b[\s\S]*?<\/item>/gi)) ?? [];
  const out: Article[] = [];
  for (const item of items) {
    const title = htmlToText(decodeEntities(tag(item, 'title') ?? ''));
    const link = atom ? atomLink(item) : tag(item, 'link');
    const url = htmlToText(link ?? '').replace(/\?at_medium=RSS.*$/, '');
    if (!title || !url.startsWith('http')) continue;
    const published = Date.parse(htmlToText(tag(item, 'pubDate') ?? tag(item, 'dc:date') ?? tag(item, 'published') ?? tag(item, 'updated') ?? '')) || 0;
    const summary = htmlToText(decodeEntities(tag(item, 'description') ?? tag(item, 'summary') ?? tag(item, 'content') ?? '').replace(/<\/p>/gi, '\n'))
      .replace(/\s*Continue reading\.*\s*$/i, '')
      .split('\n')[0]
      .slice(0, 280);
    out.push({ id: url, title, summary, url, image: bestImage(item), source: sourceName(url), published, topic });
  }
  return out.sort((a, b) => b.published - a.published);
}

const DAY_MS = 24 * 60 * 60_000;

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

// ---- Search (Google News): every publisher, for anything the topics don't cover.


const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Topic names that need a clearer search to find older stories. */
const TOPIC_QUERIES: Record<string, string> = {
  'world.top': 'world news',
  'world.good_news': 'good news',
  'tech.tech': 'technology',
  'sport.football': 'football soccer',
  'football.womens': "women's football",
  'football.transfers': 'football transfer',
  'business.money': 'personal finance',
  'ideas.opinion': 'opinion',
  'culture.stage': 'theatre',
};

export function topicQuery(topicId: string): string {
  return TOPIC_QUERIES[topicId] ?? topicById(topicId)?.title ?? topicId;
}

/** Google News for one topic in a window of days: how the feed goes back in time as you scroll. */
export function olderUrl(topicId: string, before: number, days: number): string {
  return searchUrl(`${topicQuery(topicId)} before:${ymd(before)} after:${ymd(before - days * DAY_MS)}`);
}

/** Google News titles end in " - Publisher"; the publisher goes in `source`. */
export function parseSearch(xml: string): Article[] {
  return parseFeed(xml, 'search').map((a) => {
    const m = a.title.match(/^(.*) - ([^-]+)$/);
    return { ...a, title: m ? m[1] : a.title, source: m ? m[2].trim() : a.source, summary: '' };
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

// ---- Reader view

export type Block = { type: 'p' | 'h' | 'quote'; text: string } | { type: 'img'; src: string; caption?: string };

export interface ReadableArticle {
  title: string;
  image?: string;
  byline?: string;
  blocks: Block[];
}

/** The same picture in another size has the same file name. */
function pictureKey(url: string | undefined): string {
  return (url ?? '').split('?')[0].split('/').pop() ?? '';
}

function meta(html: string, key: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]*>`, 'i');
  const m = html.match(re);
  return m ? attr(m[0], 'content') : undefined;
}

/** Things that are never part of the story: scripts, menus, sign-up boxes, share buttons. */
const NOISE = /<(script|style|noscript|svg|nav|aside|footer|form|button|iframe|template)\b[\s\S]*?<\/\1>/gi;
const BOILERPLATE = /(cookie|sign up|sign in|subscribe|newsletter|advertisement|related topics|follow us|share this|copyright|all rights reserved|download the app|get in touch|click here|support the guardian|privacy (policy|notice))/i;

/**
 * The readable part of an article page: its title, main picture, and the
 * paragraphs, sub-headings, quotes and pictures inside <article> (or <main>).
 * Returns null when there isn't enough text to be worth showing.
 */
export function extractArticle(html: string): ReadableArticle | null {
  const title = htmlToText(meta(html, 'og:title') ?? tag(html, 'title') ?? '');
  let image = meta(html, 'og:image');
  const author = meta(html, 'author') ?? meta(html, 'article:author');
  // Some sites give a profile link as the author: make a name of it.
  const byline = author && /^https?:/.test(author) ? titleCase((author.split('/').filter(Boolean).pop() ?? '').replace(/-/g, ' ')) : author;
  /** The lead picture as it appears in the article, without the logo stamped on share images. */
  let cleanHero: string | undefined;

  const start = html.search(/<article\b/i);
  const end = html.lastIndexOf('</article>');
  let body = start >= 0 && end > start ? html.slice(start, end) : (tag(html, 'main') ?? tag(html, 'body') ?? html);
  body = body.replace(/<!--[\s\S]*?-->/g, '').replace(NOISE, '');

  const blocks: Block[] = [];
  const seen = new Set<string>();
  const re = /<(p|h2|h3|blockquote|figure)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const m of body.matchAll(re)) {
    const kind = m[1].toLowerCase();
    if (kind === 'figure') {
      const img = m[2].match(/<img[^>]+?(?:src|data-src)="([^"]+)"/i);
      const src = img ? decodeEntities(img[1]) : undefined;
      if (src && !cleanHero && pictureKey(src) === pictureKey(image)) cleanHero = src;
      if (src && /^https?:/.test(src) && !src.endsWith('.svg') && !seen.has(src) && pictureKey(src) !== pictureKey(image)) {
        seen.add(src);
        const caption = htmlToText(tag(m[2], 'figcaption') ?? '');
        blocks.push({ type: 'img', src, caption: caption || undefined });
      }
      continue;
    }
    const text = htmlToText(m[2]);
    if (!text || seen.has(text)) continue;
    if (kind === 'p' && text.length < 40) continue;
    if (text.length < 160 && BOILERPLATE.test(text)) continue;
    seen.add(text);
    blocks.push({ type: kind === 'p' ? 'p' : kind === 'blockquote' ? 'quote' : 'h', text });
  }
  // Headings and pictures with no text after them are page furniture, not story.
  while (blocks.length && blocks[blocks.length - 1].type !== 'p') blocks.pop();
  const paragraphs = blocks.filter((b) => b.type === 'p').length;
  if (paragraphs < 2) return null;
  // An unsigned Guardian picture can be asked for wider.
  if (cleanHero) image = /[?&]s=none/.test(cleanHero) ? cleanHero.replace(/width=\d+/, 'width=1000') : cleanHero;
  return { title, image, byline, blocks };
}

// ---- Formatting

function titleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function timeAgo(ms: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - ms) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
