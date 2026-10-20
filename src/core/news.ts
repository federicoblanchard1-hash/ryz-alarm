// News for the Morning screen: the topics you can follow, an RSS parser, and a
// reader view that pulls an article's text out of its page so it can be shown
// in Ryz, without the site's pop-ups, cookie banners or sign-up walls.
//
// Each topic reads several publishers (BBC, The Guardian, NYT, Sky, France 24,
// Euronews, Wired, The Verge, ESPN, Autosport, Variety…), all free RSS feeds
// that were checked to return stories, and the feed mixes them evenly.

const BBC = 'https://feeds.bbci.co.uk';
const GUARDIAN = 'https://www.theguardian.com';
const ESPN = 'https://www.espn.com/espn/rss';
const F = {
  nytWorld: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  sky: 'https://feeds.skynews.com/feeds/rss/world.xml',
  france24: 'https://www.france24.com/en/rss',
  euronews: 'https://www.euronews.com/rss?format=mrss&level=theme&name=news',
  abc: 'https://feeds.abcnews.com/abcnews/internationalheadlines',
  aljazeera: 'https://www.aljazeera.com/xml/rss/all.xml',
  dw: 'https://rss.dw.com/xml/rss-en-all',
  lemonde: 'https://www.lemonde.fr/en/rss/une.xml',
  rts: 'https://www.rts.ch/info/?format=rss/news',
  letemps: 'https://www.letemps.ch/articles.rss',
  verge: 'https://www.theverge.com/rss/index.xml',
  wired: 'https://www.wired.com/feed/rss',
  engadget: 'https://www.engadget.com/rss.xml',
  techcrunch: 'https://techcrunch.com/feed/',
  ars: 'https://arstechnica.com/feed/',
  mac9to5: 'https://9to5mac.com/feed/',
  mitTech: 'https://www.technologyreview.com/feed/',
  ign: 'https://feeds.feedburner.com/ign/all',
  polygon: 'https://www.polygon.com/rss/index.xml',
  kotaku: 'https://kotaku.com/rss',
  fortune: 'https://fortune.com/feed/',
  inc: 'https://www.inc.com/rss/',
  fastco: 'https://www.fastcompany.com/latest/rss',
  marketwatch: 'https://feeds.marketwatch.com/marketwatch/topstories/',
  coindesk: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  sciencedaily: 'https://www.sciencedaily.com/rss/all.xml',
  sdHealth: 'https://www.sciencedaily.com/rss/health_medicine.xml',
  phys: 'https://phys.org/rss-feed/',
  livescience: 'https://www.livescience.com/feeds/all',
  smithsonian: 'https://www.smithsonianmag.com/rss/latest_articles/',
  nature: 'https://www.nature.com/nature.rss',
  space: 'https://www.space.com/feeds/all',
  nasa: 'https://www.nasa.gov/feed/',
  psychToday: 'https://www.psychologytoday.com/us/front/feed',
  carbonBrief: 'https://www.carbonbrief.org/feed/',
  insideClimate: 'https://insideclimatenews.org/feed/',
  runnersWorld: 'https://www.runnersworld.com/rss/all.xml/',
  mensHealth: 'https://www.menshealth.com/rss/all.xml/',
  skyFootball: 'https://www.skysports.com/rss/12040',
  autosport: 'https://www.autosport.com/rss/f1/news/',
  motorsport: 'https://www.motorsport.com/rss/f1/news/',
  cyclingnews: 'https://www.cyclingnews.com/rss/',
  variety: 'https://variety.com/feed/',
  thr: 'https://www.hollywoodreporter.com/feed/',
  pitchfork: 'https://pitchfork.com/rss/news/',
  rollingStone: 'https://www.rollingstone.com/feed/',
  vogue: 'https://www.vogue.com/feed/rss',
  bonappetit: 'https://www.bonappetit.com/feed/rss',
  dezeen: 'https://www.dezeen.com/feed/',
};

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
      ['switzerland', 'Switzerland', `${GUARDIAN}/world/switzerland/rss`, F.rts, F.letemps],
      ['europe', 'Europe', `${BBC}/news/world/europe/rss.xml`, F.euronews, F.france24, F.dw],
      ['us', 'US & Canada', `${BBC}/news/world/us_and_canada/rss.xml`, F.abc],
      ['asia', 'Asia', `${BBC}/news/world/asia/rss.xml`],
      ['africa', 'Africa', `${BBC}/news/world/africa/rss.xml`],
      ['middle_east', 'Middle East', `${BBC}/news/world/middle_east/rss.xml`, F.aljazeera],
      ['latin_america', 'Latin America', `${BBC}/news/world/latin_america/rss.xml`],
      ['top', 'Top stories', F.nytWorld, `${BBC}/news/world/rss.xml`, F.sky, F.france24, `${GUARDIAN}/world/rss`, F.euronews, F.abc, F.aljazeera, F.lemonde],
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
      ['france', 'France', `${GUARDIAN}/world/france/rss`, F.lemonde, F.france24],
      ['germany', 'Germany', `${GUARDIAN}/world/germany/rss`, F.dw],
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
      ['business', 'Business', `${BBC}/news/business/rss.xml`, F.fortune, F.inc, F.fastco],
      ['economy', 'Economy', `${GUARDIAN}/business/economics/rss`],
      ['markets', 'Markets', `${GUARDIAN}/business/stock-markets/rss`, F.marketwatch],
      ['money', 'Personal finance', `${GUARDIAN}/money/rss`],
      ['crypto', 'Crypto', `${GUARDIAN}/technology/cryptocurrencies/rss`, F.coindesk],
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
      ['tech', 'Tech news', `${BBC}/news/technology/rss.xml`, F.verge, F.wired, `${GUARDIAN}/technology/rss`, F.techcrunch, F.ars],
      ['ai', 'Artificial intelligence', `${GUARDIAN}/technology/artificialintelligenceai/rss`, F.mitTech],
      ['gadgets', 'Gadgets', 'https://feeds.arstechnica.com/arstechnica/gadgets', F.engadget],
      ['apple', 'Apple', `${GUARDIAN}/technology/apple/rss`, F.mac9to5],
      ['google', 'Google', `${GUARDIAN}/technology/google/rss`],
      ['computing', 'Computing', `${GUARDIAN}/technology/computing/rss`],
      ['robots', 'Robots', `${GUARDIAN}/technology/robots/rss`],
      ['policy', 'Tech policy', 'https://feeds.arstechnica.com/arstechnica/tech-policy'],
      ['games', 'Video games', `${GUARDIAN}/games/rss`, F.ign, F.polygon, F.kotaku],
      ['nintendo', 'Nintendo', `${GUARDIAN}/games/nintendo/rss`],
      ['cars', 'Cars', `${GUARDIAN}/technology/motoring/rss`],
    ]),
  },
  {
    id: 'science',
    title: 'Science & health',
    icon: 'flask-outline',
    topics: topics('science', [
      ['science', 'Science', `${GUARDIAN}/science/rss`, F.livescience, F.sciencedaily, 'https://feeds.arstechnica.com/arstechnica/science', F.smithsonian, F.nature],
      ['space', 'Space', `${GUARDIAN}/science/space/rss`, F.space, F.nasa],
      ['physics', 'Physics', `${GUARDIAN}/science/physics/rss`, F.phys],
      ['biology', 'Biology', `${GUARDIAN}/science/biology/rss`],
      ['neuroscience', 'Brain & neuroscience', `${GUARDIAN}/science/neuroscience/rss`],
      ['psychology', 'Psychology', `${GUARDIAN}/science/psychology/rss`, F.psychToday],
      ['medical', 'Medical research', `${GUARDIAN}/science/medical-research/rss`],
      ['archaeology', 'Archaeology', `${GUARDIAN}/science/archaeology/rss`],
      ['dinosaurs', 'Dinosaurs', `${GUARDIAN}/science/dinosaurs/rss`],
      ['wildlife', 'Wildlife', `${GUARDIAN}/environment/wildlife/rss`],
      ['climate', 'Climate & environment', `${GUARDIAN}/environment/climate-crisis/rss`, F.carbonBrief, `${GUARDIAN}/environment/rss`, F.insideClimate],
      ['health', 'Health', `${BBC}/news/health/rss.xml`, F.sdHealth],
      ['wellbeing', 'Wellbeing', `${GUARDIAN}/lifeandstyle/health-and-wellbeing/rss`],
    ]),
  },
  {
    id: 'fitness',
    title: 'Fitness & mind',
    icon: 'barbell-outline',
    topics: topics('fitness', [
      ['sleep', 'Sleep', `${GUARDIAN}/lifeandstyle/sleep/rss`],
      ['fitness', 'Fitness', `${GUARDIAN}/lifeandstyle/fitness/rss`, F.mensHealth],
      ['running', 'Running', `${GUARDIAN}/lifeandstyle/running/rss`, F.runnersWorld],
      ['yoga', 'Yoga', `${GUARDIAN}/lifeandstyle/yoga/rss`],
      ['mental_health', 'Mental health', `${GUARDIAN}/society/mental-health/rss`],
    ]),
  },
  {
    id: 'football',
    title: 'Football',
    icon: 'football',
    topics: topics('football', [
      ['premier_league', 'Premier League', `${BBC}/sport/football/premier-league/rss.xml`, F.skyFootball],
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
      ['football', 'Football (all)', `${ESPN}/soccer/news`, `${BBC}/sport/football/rss.xml`, F.skyFootball, `${GUARDIAN}/football/rss`],
      ['basketball', 'Basketball', `${GUARDIAN}/sport/nba/rss`, `${ESPN}/nba/news`, `${BBC}/sport/basketball/rss.xml`, `${GUARDIAN}/sport/wnba/rss`],
      ['tennis', 'Tennis', `${BBC}/sport/tennis/rss.xml`, `${ESPN}/tennis/news`],
      ['f1', 'Formula 1', F.autosport, `${BBC}/sport/formula1/rss.xml`, F.motorsport, `${GUARDIAN}/sport/formulaone/rss`, `${ESPN}/f1/news`],
      ['motorsport', 'Motorsport', `${BBC}/sport/motorsport/rss.xml`],
      ['cycling', 'Cycling', F.cyclingnews, `${BBC}/sport/cycling/rss.xml`],
      ['winter', 'Winter sports', `${BBC}/sport/winter-sports/rss.xml`, `${GUARDIAN}/sport/skiing/rss`],
      ['olympics', 'Olympics', `${GUARDIAN}/sport/olympic-games/rss`],
      ['swimming', 'Swimming', `${BBC}/sport/swimming/rss.xml`],
      ['sailing', 'Sailing', `${GUARDIAN}/sport/sailing/rss`],
      ['horse_racing', 'Horse racing', `${BBC}/sport/horse-racing/rss.xml`],
      ['snooker', 'Snooker', `${BBC}/sport/snooker/rss.xml`],
      ['darts', 'Darts', `${BBC}/sport/darts/rss.xml`],
      ['ice_hockey', 'Ice hockey', `${GUARDIAN}/sport/ice-hockey/rss`],
      ['golf', 'Golf', `${BBC}/sport/golf/rss.xml`, `${ESPN}/golf/news`],
      ['rugby', 'Rugby', `${BBC}/sport/rugby-union/rss.xml`],
      ['american_football', 'American football', `${ESPN}/nfl/news`, `${BBC}/sport/american-football/rss.xml`, `${GUARDIAN}/sport/nfl/rss`],
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
      ['entertainment', 'Entertainment', `${BBC}/news/entertainment_and_arts/rss.xml`, F.variety],
      ['film', 'Film', `${GUARDIAN}/film/rss`, F.variety, F.thr],
      ['music', 'Music', `${GUARDIAN}/music/rss`, F.pitchfork, F.rollingStone],
      ['tv', 'TV & streaming', `${GUARDIAN}/tv-and-radio/rss`],
      ['books', 'Books', `${GUARDIAN}/books/rss`],
      ['classical', 'Classical & opera', `${GUARDIAN}/music/classicalmusicandopera/rss`],
      ['rap', 'Hip-hop & rap', `${GUARDIAN}/music/rap/rss`],
      ['art', 'Art & design', `${GUARDIAN}/artanddesign/rss`, F.dezeen],
      ['photography', 'Photography', `${GUARDIAN}/artanddesign/photography/rss`],
      ['architecture', 'Architecture', `${GUARDIAN}/artanddesign/architecture/rss`, F.dezeen],
      ['stage', 'Theatre & dance', `${GUARDIAN}/stage/rss`],
      ['comedy', 'Comedy', `${GUARDIAN}/stage/comedy/rss`],
    ]),
  },
  {
    id: 'life',
    title: 'Lifestyle',
    icon: 'cafe-outline',
    topics: topics('life', [
      ['food', 'Food', `${GUARDIAN}/food/rss`, F.bonappetit],
      ['vegan', 'Vegan food', `${GUARDIAN}/food/vegan/rss`],
      ['wine', 'Wine', `${GUARDIAN}/food/wine/rss`],
      ['travel', 'Travel', `${GUARDIAN}/travel/rss`, `${GUARDIAN}/travel/europe/rss`],
      ['fashion', 'Fashion', `${GUARDIAN}/fashion/rss`, F.vogue],
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

export function searchUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

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
