// Tags each story with categories, topics and sub-topics, regions and
// countries, its language, the names in it (entities) and its format, so the
// feed can be filtered, muted and grouped. Rule-based and on the phone: a
// story is tagged with a node when the node's search terms appear in its
// headline or summary, plus the node whose feed it came from. One story can
// be in several categories.

import { COUNTRIES, regionOf } from './countries';
import type { Article, ArticleFormat, ArticleTags } from './news';
import { entityTitle, type FollowedEntity } from './newsPrefs';
import { ALL_NODES, lineage, nodeById, type NewsNode } from './taxonomy';

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9+#$&]+/g, ' ')
    .trim()} `;

/** Words too common to tag a story on their own. */
const GENERIC = new Set(
  'news world sport sports company companies policy health business economy science technology tech culture media review reviews deals daily interview rights family welfare law crime police court trial trend trending records record result results film movie music tv home students workers hiring union strike election government ministry minister president king queen prince war conflict report study research researchers scientists sale launch launches release update app online community events event market markets stock stocks shares price prices industry today new people life time year show game games team club league cup open final day week deal plan state city country national local international global care work job jobs money pay data service services system public private group groups top best how what why who appointed killed crash collision switch x pool trail skeleton bridge steam masters premier coach owners suspended takeover virus race verdict customs gemini claude jain venus jupiter'.split(
    ' ',
  ),
);

/** A node's search as alternatives, each a list of terms that must all appear. */
function alternatives(node: NewsNode): string[][] {
  const out: string[][] = [];
  const q = node.q.replace(/\{(city|region|country)\}/g, '').replace(/\b(before|after):\S+/g, '');
  for (const alt of q.split(/\s+OR\s+/)) {
    const terms = [...alt.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => norm(m[1] ?? m[2]).trim()).filter((t) => t.length >= 2);
    if (terms.length === 0) continue;
    if (terms.length === 1 && GENERIC.has(terms[0])) continue;
    out.push(terms);
  }
  // A name matches on its own title and other names too.
  if (node.name || node.depth === 3) {
    for (const n of [node.title, ...node.also]) {
      const t = norm(n.replace(/\(.*?\)|…/g, '')).trim();
      if (t.length >= 2 && !GENERIC.has(t)) out.push([t]);
    }
  }
  return out;
}

interface Alt {
  node: NewsNode;
  terms: string[];
}

/**
 * Every node's search alternatives, filed under one of their words. A story
 * only checks the alternatives filed under words it contains, instead of all
 * 850 nodes: fast enough to tag hundreds of stories without the phone
 * stuttering.
 */
let INDEX: Map<string, Alt[]> | null = null;
function index(): Map<string, Alt[]> {
  if (INDEX) return INDEX;
  INDEX = new Map();
  // Local searches depend on where you live, and categories are too broad to match on words.
  for (const node of ALL_NODES) {
    if (node.depth === 1 || node.local || node.hub) continue;
    for (const terms of alternatives(node)) {
      // File it under the first word of its longest term: the rarest, so the fewest checks.
      const key = [...terms].sort((x, y) => y.length - x.length)[0].split(' ')[0];
      const list = INDEX.get(key);
      if (list) list.push({ node, terms });
      else INDEX.set(key, [{ node, terms }]);
    }
  }
  return INDEX;
}

const has = (text: string, term: string) => text.includes(` ${term} `);

/** Taxonomy nodes a piece of text is about, most specific first. */
export function matchNodes(text: string): string[] {
  const t = norm(text);
  const idx = index();
  const hits = new Set<NewsNode>();
  for (const word of new Set(t.trim().split(' '))) {
    for (const alt of idx.get(word) ?? []) {
      if (!hits.has(alt.node) && alt.terms.every((term) => has(t, term))) hits.add(alt.node);
    }
  }
  return [...hits].sort((a, b) => b.depth - a.depth).map((n) => n.id);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let COUNTRY_RE: { re: RegExp; codes: Map<string, string[]> } | null = null;

/** Countries named in the text (by name, demonym or capital), in one pass. */
export function matchCountries(text: string): string[] {
  if (!COUNTRY_RE) {
    // A name can point at two countries (Gaza: Israel and Palestine).
    const codes = new Map<string, string[]>();
    for (const c of COUNTRIES) for (const n of [c.name, ...c.also]) codes.set(n, [...(codes.get(n) ?? []), c.code]);
    // Longest first, so "South Sudan" wins over "Sudan".
    const names = [...codes.keys()].sort((a, b) => b.length - a.length).map(escape);
    COUNTRY_RE = { re: new RegExp(`(^|[^\\p{L}])(${names.join('|')})(?=$|[^\\p{L}])`, 'gu'), codes };
  }
  const found = new Set<string>();
  for (const m of text.matchAll(COUNTRY_RE.re)) {
    COUNTRY_RE.codes.get(m[2])?.forEach((code) => found.add(code));
  }
  return [...found];
}

const TICKER = /\$([A-Z]{1,5})\b|\((?:NASDAQ|NYSE|LSE|SIX|TSX|ASX|EPA|ETR|TYO|HKEX):\s*([A-Z0-9.]{1,6})\)/g;
const STOP_START = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'How', 'Why', 'What', 'When', 'Who', 'Watch', 'Live', 'Breaking', 'Opinion', 'Analysis', 'Review', 'Exclusive', 'Video', 'Photos', 'Le', 'La', 'Les', 'Der', 'Die', 'Das', 'El', 'Los']);

/** Names in the text: known names from the taxonomy, followed entities, countries, tickers, and runs of capitalised words. */
export function extractEntities(article: Pick<Article, 'title' | 'summary'>, follows: FollowedEntity[] = [], countries: string[] = [], matched?: string[]): string[] {
  const text = `${article.title}. ${article.summary}`;
  const out = new Set<string>();
  const t = norm(text);
  for (const e of follows) if (has(t, norm(e.name).trim())) out.add(entityTitle(e));
  for (const id of matched ?? matchNodes(text)) {
    const n = nodeById(id);
    if (n?.name) out.add(n.title);
  }
  for (const code of countries) {
    const c = COUNTRIES.find((x) => x.code === code);
    if (c) out.add(c.name);
  }
  for (const m of text.matchAll(TICKER)) out.add(`$${m[1] ?? m[2]}`);
  // Two to four capitalised words in a row: people, teams, companies, places.
  for (const m of article.title.matchAll(/\b(\p{Lu}[\p{L}'’.-]+(?:\s+(?:de|da|van|von|al|bin|du|di|del|le|la)?\s*\p{Lu}[\p{L}'’.-]+){1,3})/gu)) {
    const words = m[1].split(/\s+/);
    if (STOP_START.has(words[0])) words.shift();
    if (words.length >= 2) out.add(words.join(' '));
  }
  return [...out].slice(0, 8);
}

const LIVE = /\b(live|as it happened|minute-by-minute|en direct|en vivo|ao vivo|in diretta|liveblog|live updates)\b/i;
const GALLERY = /\b(in pictures|photos|photo gallery|gallery|in photos|week in pictures|fotos|en images)\b|\/(gallery|galleries|pictures|in-pictures)\//i;
const LONGREAD = /\b(the long read|long read|longread|deep dive|essay)\b|\/(long-read|longform|longreads)\//i;

/** Article, video, audio, live blog, gallery, long read or short brief. */
export function formatOf(a: Article): ArticleFormat {
  if (a.media?.kind === 'audio') return 'audio';
  if (a.media?.kind === 'video' || /\/videos?\/|\/av\/|youtube\.com|youtu\.be/.test(a.url) || /^(watch|video)\b/i.test(a.title)) return 'video';
  if (LIVE.test(a.title) || /\/live\/|\/live-news\/|\/liveblog/.test(a.url)) return 'live';
  if (GALLERY.test(a.title) || GALLERY.test(a.url)) return 'gallery';
  if (LONGREAD.test(a.title) || /\/(long-read|longform|longreads)\//.test(a.url) || a.sourceId === 'aeon' || a.topic === 'opinion.long-reads') return 'longread';
  if (a.summary.length > 0 && a.summary.length < 90) return 'brief';
  return 'article';
}

/** Every tag for a story. */
export function tagArticle(a: Article, follows: FollowedEntity[] = []): ArticleTags {
  const text = `${a.title}. ${a.summary}`;
  const matched = matchNodes(text);
  const topics = new Set<string>(matched);
  // The node whose feed it came from (and its parents) always count.
  if (nodeById(a.topic)) lineage(a.topic).forEach((n) => topics.add(n.id));
  // Parents of anything matched count too: a Premier League story is a football and a sports story.
  for (const id of [...topics]) lineage(id).forEach((n) => topics.add(n.id));
  const named = matchCountries(text);
  // Where it's from when it doesn't say: the publisher's country.
  const countries = named.length ? named : a.country && a.country !== 'INT' ? [a.country] : [];
  const regions = [...new Set(countries.map(regionOf).filter((r): r is NonNullable<typeof r> => Boolean(r)))];
  return {
    categories: [...new Set([...topics].map((id) => id.split('.')[0]))],
    topics: [...topics],
    regions,
    countries,
    language: a.language ?? 'en',
    entities: extractEntities(a, follows, countries, matched),
    format: formatOf(a),
  };
}

export function tagAll(list: Article[], follows: FollowedEntity[] = []): Article[] {
  return list.map((a) => (a.tags ? a : { ...a, tags: tagArticle(a, follows) }));
}
