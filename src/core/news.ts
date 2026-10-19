// News for the Morning screen: the topics you can follow, an RSS parser, and a
// reader view that pulls an article's text out of its page so it can be shown
// in Ryz, without the site's pop-ups, cookie banners or sign-up walls.
//
// Sources are BBC and The Guardian (plus Ars Technica for gadgets): free to
// read, no paywall, available in Switzerland, and every story has a picture.

const BBC = 'https://feeds.bbci.co.uk';
const GUARDIAN = 'https://www.theguardian.com';

export interface Topic {
  /** "category.topic", stored in settings. */
  id: string;
  title: string;
  feeds: string[];
}

export interface Category {
  id: string;
  title: string;
  /** Ionicons name. */
  icon: string;
  topics: Topic[];
}

function topics(category: string, list: [string, string, ...string[]][]): Topic[] {
  return list.map(([id, title, ...feeds]) => ({ id: `${category}.${id}`, title, feeds }));
}

export const CATEGORIES: Category[] = [
  {
    id: 'world',
    title: 'World',
    icon: 'earth-outline',
    topics: topics('world', [
      ['switzerland', 'Switzerland', `${GUARDIAN}/world/switzerland/rss`],
      ['europe', 'Europe', `${BBC}/news/world/europe/rss.xml`],
      ['us', 'US & Canada', `${BBC}/news/world/us_and_canada/rss.xml`],
      ['asia', 'Asia', `${BBC}/news/world/asia/rss.xml`],
      ['africa', 'Africa', `${BBC}/news/world/africa/rss.xml`],
      ['middle_east', 'Middle East', `${BBC}/news/world/middle_east/rss.xml`],
      ['latin_america', 'Latin America', `${BBC}/news/world/latin_america/rss.xml`],
      ['ukraine', 'Ukraine', `${GUARDIAN}/world/ukraine/rss`],
      ['good_news', 'Good news', `${GUARDIAN}/world/series/the-upside/rss`],
    ]),
  },
  {
    id: 'countries',
    title: 'Countries',
    icon: 'flag-outline',
    topics: topics('countries', [
      ['uk', 'United Kingdom', `${BBC}/news/uk/rss.xml`],
      ['france', 'France', `${GUARDIAN}/world/france/rss`],
      ['germany', 'Germany', `${GUARDIAN}/world/germany/rss`],
      ['italy', 'Italy', `${GUARDIAN}/world/italy/rss`],
      ['spain', 'Spain', `${GUARDIAN}/world/spain/rss`],
      ['portugal', 'Portugal', `${GUARDIAN}/world/portugal/rss`],
      ['netherlands', 'Netherlands', `${GUARDIAN}/world/netherlands/rss`],
      ['belgium', 'Belgium', `${GUARDIAN}/world/belgium/rss`],
      ['austria', 'Austria', `${GUARDIAN}/world/austria/rss`],
      ['russia', 'Russia', `${GUARDIAN}/world/russia/rss`],
      ['israel', 'Israel', `${GUARDIAN}/world/israel/rss`],
      ['iran', 'Iran', `${GUARDIAN}/world/iran/rss`],
      ['india', 'India', `${GUARDIAN}/world/india/rss`],
      ['china', 'China', `${GUARDIAN}/world/china/rss`],
      ['japan', 'Japan', `${GUARDIAN}/world/japan/rss`],
      ['south_korea', 'South Korea', `${GUARDIAN}/world/south-korea/rss`],
      ['australia', 'Australia', `${GUARDIAN}/australia-news/rss`],
      ['canada', 'Canada', `${GUARDIAN}/world/canada/rss`],
      ['mexico', 'Mexico', `${GUARDIAN}/world/mexico/rss`],
      ['brazil', 'Brazil', `${GUARDIAN}/world/brazil/rss`],
    ]),
  },
  {
    id: 'politics',
    title: 'Politics',
    icon: 'podium-outline',
    topics: topics('politics', [
      ['eu', 'European Union', `${GUARDIAN}/world/eu/rss`],
      ['us', 'US politics', `${GUARDIAN}/us-news/us-politics/rss`],
      ['uk', 'UK politics', `${BBC}/news/politics/rss.xml`],
      ['law', 'Law & justice', `${GUARDIAN}/law/rss`],
    ]),
  },
  {
    id: 'ideas',
    title: 'Society & ideas',
    icon: 'bulb-outline',
    topics: topics('ideas', [
      ['society', 'Society', `${GUARDIAN}/society/rss`],
      ['opinion', 'Opinion', `${GUARDIAN}/commentisfree/rss`],
      ['philosophy', 'Philosophy', `${GUARDIAN}/world/philosophy/rss`],
      ['media', 'Media', `${GUARDIAN}/media/rss`],
    ]),
  },
  {
    id: 'business',
    title: 'Business & money',
    icon: 'trending-up-outline',
    topics: topics('business', [
      ['business', 'Business', `${BBC}/news/business/rss.xml`],
      ['economy', 'Economy', `${GUARDIAN}/business/economics/rss`],
      ['markets', 'Markets', `${GUARDIAN}/business/stock-markets/rss`],
      ['money', 'Personal finance', `${GUARDIAN}/money/rss`],
      ['crypto', 'Crypto', `${GUARDIAN}/technology/cryptocurrencies/rss`],
      ['tech_business', 'Tech business', `${GUARDIAN}/business/technology/rss`],
      ['energy', 'Energy', `${GUARDIAN}/business/energy-industry/rss`],
      ['retail', 'Retail', `${GUARDIAN}/business/retail/rss`],
      ['property', 'Property', `${GUARDIAN}/money/property/rss`],
      ['careers', 'Work & careers', `${GUARDIAN}/money/work-and-careers/rss`],
    ]),
  },
  {
    id: 'tech',
    title: 'Technology',
    icon: 'hardware-chip-outline',
    topics: topics('tech', [
      ['tech', 'Tech news', `${BBC}/news/technology/rss.xml`, `${GUARDIAN}/technology/rss`],
      ['ai', 'Artificial intelligence', `${GUARDIAN}/technology/artificialintelligenceai/rss`],
      ['gadgets', 'Gadgets', 'https://feeds.arstechnica.com/arstechnica/gadgets'],
      ['apple', 'Apple', `${GUARDIAN}/technology/apple/rss`],
      ['google', 'Google', `${GUARDIAN}/technology/google/rss`],
      ['computing', 'Computing', `${GUARDIAN}/technology/computing/rss`],
      ['robots', 'Robots', `${GUARDIAN}/technology/robots/rss`],
      ['policy', 'Tech policy', 'https://feeds.arstechnica.com/arstechnica/tech-policy'],
      ['games', 'Video games', `${GUARDIAN}/games/rss`],
      ['nintendo', 'Nintendo', `${GUARDIAN}/games/nintendo/rss`],
      ['cars', 'Cars', `${GUARDIAN}/technology/motoring/rss`],
    ]),
  },
  {
    id: 'science',
    title: 'Science & health',
    icon: 'flask-outline',
    topics: topics('science', [
      ['science', 'Science', `${GUARDIAN}/science/rss`, 'https://feeds.arstechnica.com/arstechnica/science'],
      ['space', 'Space', `${GUARDIAN}/science/space/rss`],
      ['physics', 'Physics', `${GUARDIAN}/science/physics/rss`],
      ['biology', 'Biology', `${GUARDIAN}/science/biology/rss`],
      ['neuroscience', 'Brain & neuroscience', `${GUARDIAN}/science/neuroscience/rss`],
      ['psychology', 'Psychology', `${GUARDIAN}/science/psychology/rss`],
      ['medical', 'Medical research', `${GUARDIAN}/science/medical-research/rss`],
      ['archaeology', 'Archaeology', `${GUARDIAN}/science/archaeology/rss`],
      ['dinosaurs', 'Dinosaurs', `${GUARDIAN}/science/dinosaurs/rss`],
      ['wildlife', 'Wildlife', `${GUARDIAN}/environment/wildlife/rss`],
      ['climate', 'Climate & environment', `${GUARDIAN}/environment/climate-crisis/rss`, `${GUARDIAN}/environment/rss`],
      ['health', 'Health', `${BBC}/news/health/rss.xml`],
      ['wellbeing', 'Wellbeing', `${GUARDIAN}/lifeandstyle/health-and-wellbeing/rss`],
    ]),
  },
  {
    id: 'fitness',
    title: 'Fitness & mind',
    icon: 'barbell-outline',
    topics: topics('fitness', [
      ['sleep', 'Sleep', `${GUARDIAN}/lifeandstyle/sleep/rss`],
      ['fitness', 'Fitness', `${GUARDIAN}/lifeandstyle/fitness/rss`],
      ['running', 'Running', `${GUARDIAN}/lifeandstyle/running/rss`],
      ['yoga', 'Yoga', `${GUARDIAN}/lifeandstyle/yoga/rss`],
      ['mental_health', 'Mental health', `${GUARDIAN}/society/mental-health/rss`],
    ]),
  },
  {
    id: 'football',
    title: 'Football',
    icon: 'football',
    topics: topics('football', [
      ['premier_league', 'Premier League', `${BBC}/sport/football/premier-league/rss.xml`],
      ['champions_league', 'Champions League', `${BBC}/sport/football/champions-league/rss.xml`],
      ['la_liga', 'La Liga', `${GUARDIAN}/football/laligafootball/rss`],
      ['serie_a', 'Serie A', `${GUARDIAN}/football/serieafootball/rss`],
      ['bundesliga', 'Bundesliga', `${GUARDIAN}/football/bundesligafootball/rss`],
      ['ligue_1', 'Ligue 1', `${GUARDIAN}/football/ligue1football/rss`],
      ['mls', 'MLS', `${GUARDIAN}/football/mls/rss`],
      ['womens', "Women's football", `${GUARDIAN}/football/womensfootball/rss`],
      ['world_cup', 'World Cup 2026', `${GUARDIAN}/football/world-cup-2026/rss`],
      ['transfers', 'Transfers', `${GUARDIAN}/football/transfer-window/rss`],
    ]),
  },
  {
    id: 'sport',
    title: 'Sport',
    icon: 'football-outline',
    topics: topics('sport', [
      ['football', 'Football (all)', `${BBC}/sport/football/rss.xml`],
      ['basketball', 'Basketball', `${GUARDIAN}/sport/nba/rss`, `${BBC}/sport/basketball/rss.xml`, `${GUARDIAN}/sport/wnba/rss`],
      ['tennis', 'Tennis', `${BBC}/sport/tennis/rss.xml`],
      ['f1', 'Formula 1', `${BBC}/sport/formula1/rss.xml`, `${GUARDIAN}/sport/formulaone/rss`],
      ['motorsport', 'Motorsport', `${BBC}/sport/motorsport/rss.xml`],
      ['cycling', 'Cycling', `${BBC}/sport/cycling/rss.xml`],
      ['winter', 'Winter sports', `${BBC}/sport/winter-sports/rss.xml`, `${GUARDIAN}/sport/skiing/rss`],
      ['olympics', 'Olympics', `${GUARDIAN}/sport/olympic-games/rss`],
      ['swimming', 'Swimming', `${BBC}/sport/swimming/rss.xml`],
      ['sailing', 'Sailing', `${GUARDIAN}/sport/sailing/rss`],
      ['horse_racing', 'Horse racing', `${BBC}/sport/horse-racing/rss.xml`],
      ['snooker', 'Snooker', `${BBC}/sport/snooker/rss.xml`],
      ['darts', 'Darts', `${BBC}/sport/darts/rss.xml`],
      ['ice_hockey', 'Ice hockey', `${GUARDIAN}/sport/ice-hockey/rss`],
      ['golf', 'Golf', `${BBC}/sport/golf/rss.xml`],
      ['rugby', 'Rugby', `${BBC}/sport/rugby-union/rss.xml`],
      ['american_football', 'American football', `${BBC}/sport/american-football/rss.xml`, `${GUARDIAN}/sport/nfl/rss`],
      ['baseball', 'Baseball', `${GUARDIAN}/sport/baseball/rss`],
      ['boxing', 'Boxing', `${BBC}/sport/boxing/rss.xml`],
      ['mma', 'MMA', `${BBC}/sport/mixed-martial-arts/rss.xml`],
      ['athletics', 'Athletics', `${BBC}/sport/athletics/rss.xml`],
      ['cricket', 'Cricket', `${BBC}/sport/cricket/rss.xml`],
    ]),
  },
  {
    id: 'culture',
    title: 'Culture',
    icon: 'film-outline',
    topics: topics('culture', [
      ['entertainment', 'Entertainment', `${BBC}/news/entertainment_and_arts/rss.xml`],
      ['film', 'Film', `${GUARDIAN}/film/rss`],
      ['music', 'Music', `${GUARDIAN}/music/rss`],
      ['tv', 'TV & streaming', `${GUARDIAN}/tv-and-radio/rss`],
      ['books', 'Books', `${GUARDIAN}/books/rss`],
      ['classical', 'Classical & opera', `${GUARDIAN}/music/classicalmusicandopera/rss`],
      ['rap', 'Hip-hop & rap', `${GUARDIAN}/music/rap/rss`],
      ['art', 'Art & design', `${GUARDIAN}/artanddesign/rss`],
      ['photography', 'Photography', `${GUARDIAN}/artanddesign/photography/rss`],
      ['architecture', 'Architecture', `${GUARDIAN}/artanddesign/architecture/rss`],
      ['stage', 'Theatre & dance', `${GUARDIAN}/stage/rss`],
      ['comedy', 'Comedy', `${GUARDIAN}/stage/comedy/rss`],
    ]),
  },
  {
    id: 'life',
    title: 'Lifestyle',
    icon: 'cafe-outline',
    topics: topics('life', [
      ['food', 'Food', `${GUARDIAN}/food/rss`],
      ['vegan', 'Vegan food', `${GUARDIAN}/food/vegan/rss`],
      ['wine', 'Wine', `${GUARDIAN}/food/wine/rss`],
      ['travel', 'Travel', `${GUARDIAN}/travel/rss`, `${GUARDIAN}/travel/europe/rss`],
      ['fashion', 'Fashion', `${GUARDIAN}/fashion/rss`],
      ['beauty', 'Beauty', `${GUARDIAN}/fashion/beauty/rss`],
      ['relationships', 'Relationships', `${GUARDIAN}/lifeandstyle/relationships/rss`],
      ['family', 'Family & parenting', `${GUARDIAN}/lifeandstyle/family/rss`],
      ['pets', 'Pets', `${GUARDIAN}/lifeandstyle/pets/rss`],
      ['home', 'Home & garden', `${GUARDIAN}/lifeandstyle/homes/rss`, `${GUARDIAN}/lifeandstyle/gardens/rss`],
    ]),
  },
  {
    id: 'education',
    title: 'Education',
    icon: 'school-outline',
    topics: topics('education', [
      ['education', 'Education', `${BBC}/news/education/rss.xml`, `${GUARDIAN}/education/rss`],
      ['universities', 'Universities', `${GUARDIAN}/education/universities/rss`],
      ['schools', 'Schools', `${GUARDIAN}/education/schools/rss`],
    ]),
  },
];

const TOPICS = new Map(CATEGORIES.flatMap((c) => c.topics.map((t) => [t.id, t] as const)));

export function topicById(id: string): Topic | undefined {
  return TOPICS.get(id);
}

/** The feeds to read for these topics: one per topic first, so every interest shows up, up to `max`. */
export function feedsFor(topicIds: string[], max = 18): { url: string; topic: string }[] {
  const chosen = topicIds.map(topicById).filter((t): t is Topic => Boolean(t));
  const out: { url: string; topic: string }[] = [];
  const seen = new Set<string>();
  for (let round = 0; out.length < max; round++) {
    let added = false;
    for (const t of chosen) {
      const url = t.feeds[round];
      if (url && !seen.has(url) && out.length < max) {
        seen.add(url);
        out.push({ url, topic: t.id });
        added = true;
      }
    }
    if (!added) break;
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

function sourceName(url: string): string {
  if (url.includes('bbc.')) return 'BBC';
  if (url.includes('theguardian.com')) return 'The Guardian';
  if (url.includes('arstechnica.com')) return 'Ars Technica';
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

/** Articles in an RSS 2.0 feed, newest first. */
export function parseFeed(xml: string, topic: string): Article[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const out: Article[] = [];
  for (const item of items) {
    const title = htmlToText(tag(item, 'title') ?? '');
    const url = htmlToText(tag(item, 'link') ?? '').replace(/\?at_medium=RSS.*$/, '');
    if (!title || !url) continue;
    const published = Date.parse(htmlToText(tag(item, 'pubDate') ?? tag(item, 'dc:date') ?? '')) || 0;
    const summary = htmlToText(decodeEntities(tag(item, 'description') ?? '').replace(/<\/p>/gi, '\n'))
      .replace(/\s*Continue reading\.*\s*$/i, '')
      .split('\n')[0]
      .slice(0, 280);
    out.push({ id: url, title, summary, url, image: bestImage(item), source: sourceName(url), published, topic });
  }
  return out.sort((a, b) => b.published - a.published);
}

/** Feeds merged newest first, without the same story twice. */
export function mergeArticles(lists: Article[][], limit = 40): Article[] {
  const seen = new Set<string>();
  const all = lists.flat().sort((a, b) => b.published - a.published);
  const out: Article[] = [];
  for (const a of all) {
    const key = a.title.toLowerCase().replace(/\W+/g, ' ').trim();
    if (seen.has(a.url) || seen.has(key)) continue;
    seen.add(a.url);
    seen.add(key);
    out.push(a);
    if (out.length >= limit) break;
  }
  return out;
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
