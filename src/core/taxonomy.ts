// Every news category, topic and sub-topic Ryz offers: the 31 categories of
// docs/news-brief.md, in one tree. IDs are hierarchical,
// `category.topic.subtopic` (e.g. `sports.football.premier-league`), and you
// can follow or mute any level.
//
// Each node reads its own feeds (specialist publishers, official bodies and
// broadcasters from sources.ts) plus a Google News search, so no topic is ever
// without a source. A category also reads the matching Google News section and
// native-language publishers, so it works in every edition.
//
// src/core/__tests__/taxonomy.test.ts ticks every item in the brief off
// against this file.

import { bbc, dive, espn, F, guardian, motorsport, type NewsSection } from './sources';

const B = bbc;
const G = guardian;

export interface NewsNode {
  /** `category`, `category.topic` or `category.topic.subtopic`. */
  id: string;
  title: string;
  depth: 1 | 2 | 3;
  parent: string | null;
  category: string;
  /** The Google News search for this node (English). */
  q: string;
  /** A proper name (team, league, company…): searched as-is in every language edition. */
  name: boolean;
  /** Publisher feeds for this node, best first. */
  feeds: string[];
  /** A heading the node sits under in its parent (e.g. "Leagues"). */
  group?: string;
  /** Other names, for search and tagging. */
  also: string[];
  /** The search uses your country, region or city ({country}, {region}, {city}). */
  local: boolean;
  /** Ongoing story hubs: built from story clusters rather than a search. */
  hub: boolean;
  children: NewsNode[];
}

export interface NewsCategory extends NewsNode {
  emoji: string;
  /** Ionicons name. */
  icon: string;
  /** The Google News section that matches, read in each of your editions. */
  section?: NewsSection;
  /** Publishers in other languages, by language code. */
  native: Record<string, string[]>;
}

interface Def {
  title: string;
  id?: string;
  q?: string;
  name?: boolean;
  feeds?: string[];
  group?: string;
  also?: string[];
  local?: boolean;
  hub?: boolean;
  /** Default search for the children: `{}` is the child's title. */
  each?: string;
  kids?: Def[];
}

interface CatDef extends Def {
  id: string;
  emoji: string;
  icon: string;
  section?: NewsSection;
  native?: Record<string, string[]>;
}

type Opts = Omit<Def, 'title' | 'kids'>;

/** A node: title, options, children. */
function t(title: string, o: Opts | Def[] = {}, kids?: Def[]): Def {
  if (Array.isArray(o)) return { title, kids: o };
  return { title, ...o, kids };
}

/** Proper names (teams, leagues, companies…), searched as-is in every language. */
function names(...titles: (string | [string, Opts])[]): Def[] {
  return titles.map((x) => (typeof x === 'string' ? { title: x, name: true } : { title: x[0], name: true, ...x[1] }));
}

/** Put nodes under a heading inside their parent (keeps IDs three levels deep). */
function group(label: string, defs: Def[]): Def[] {
  return defs.map((d) => ({ ...d, group: label }));
}

export function slug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function defaultQuery(title: string): string {
  const parts = title
    .replace(/…|\(.*?\)/g, '')
    .split(/\s*\/\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.map((p) => (p.includes(' ') ? `"${p}"` : p)).join(' OR ') : parts[0];
}

// ---------------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------------

const DEFS: CatDef[] = [
  // 1 ------------------------------------------------------------------------
  {
    id: 'world',
    title: 'World',
    emoji: '🌍',
    icon: 'earth-outline',
    section: 'WORLD',
    q: 'world news',
    feeds: [F.nytWorld, B('news/world'), F.sky, F.france24, G('world'), F.euronews, F.abc, F.aljazeera, F.dw, F.lemondeEn, F.rfiEn, F.cbsWorld, F.pbs, F.latimes, F.ytBbc, F.ytDw, F.ytAljazeera, F.ytFrance24, F.bbcGlobalPodcast, F.nprNewsNow, F.nytDaily, F.guardianTodayInFocus],
    native: {
      fr: [F.lemonde, F.france24fr, F.rfiFr, F.francetvinfo, F.lefigaro, F.liberation, F.rts, F.letemps],
      de: [F.tagesschau, F.dwDe, F.spiegel, F.faz, F.srf, F.nzz],
      es: [F.elpais, F.bbcMundo, F.elmundo, F.lavanguardia, F.infobae, F.clarin],
      it: [F.ansa, F.corriere, F.repubblica],
      pt: [F.folha, F.g1, F.bbcBrasil, F.rtp],
      nl: [F.nos],
      sv: [F.svt],
      no: [F.nrk],
      da: [F.dr],
      pl: [F.tvn24],
      ja: [F.nhk, F.bbcJapanese],
      ar: [F.bbcArabic],
      hi: [F.bbcHindi],
      zh: [F.bbcChinese],
      ru: [F.bbcRussian],
      tr: [F.bbcTurkce],
      sw: [F.bbcSwahili],
    },
    kids: [
      t('By region', { id: 'regions', q: 'world news' }, [
        t('Europe', { feeds: [B('news/world/europe'), G('world/europe-news'), F.euronews, F.dw, F.france24, F.thelocalCh, F.irishTimes, F.rferl] }),
        t('North America', { q: 'United States OR Canada OR Mexico news', feeds: [B('news/world/us_and_canada'), G('us-news'), F.cbsUs, F.cbc, F.globalnews, F.globeAndMail] }),
        t('Latin America', { feeds: [B('news/world/latin_america'), G('world/americas'), F.mercopress, F.batimes, F.bbcMundo] }),
        t('Africa', { feeds: [B('news/world/africa'), G('world/africa'), F.africanews, F.allafrica, F.premiumTimes, F.dailyMaverick, F.nationKenya, F.standardKenya, F.myjoyonline, F.bbcSwahili] }),
        t('Middle East', { feeds: [B('news/world/middle_east'), G('world/middleeast'), F.aljazeera, F.theNational, F.arabNews, F.jpost, F.ynet, F.egyptIndependent, F.dailySabah] }),
        t('Asia', { feeds: [B('news/world/asia'), G('world/asia-pacific'), F.scmp, F.japanTimes, F.straitsTimes, F.cna, F.bangkokPost, F.timesOfIndia, F.hindustanTimes, F.indianExpress, F.dawn, F.yonhap, F.taipeiTimes, F.rappler, F.vnexpress, F.kathmandu, F.diplomat] }),
        t('Oceania', { q: 'Australia OR "New Zealand" OR Pacific news', feeds: [B('news/world/australia'), G('australia-news'), F.abcAu, F.rnz, F.rnzPacific, F.smh, F.nzherald, F.stuff] }),
        t('Arctic/Antarctica', { id: 'polar', q: 'Arctic OR Antarctica', feeds: [G('world/arctic'), G('world/antarctica'), F.antarctica] }),
      ]),
      t('Conflicts & wars', { id: 'conflicts', q: 'war OR conflict', feeds: [F.crisisGroup, F.longWarJournal, F.aljazeera] }, [
        t('Active conflicts', { id: 'active', q: 'war frontline fighting', feeds: [F.crisisGroup, F.pravdaUa] }),
        t('Ceasefires', { q: 'ceasefire' }),
        t('Civil unrest', { q: '"civil unrest" OR riots', feeds: [G('world/protest')] }),
        t('Coups', { q: 'coup military junta' }),
        t('War crimes', { q: '"war crimes"', feeds: [G('world/war-crimes'), G('law/international-criminal-court')] }),
        t('Prisoners of war & missing persons', { id: 'pows-missing', q: '"prisoners of war" OR "missing persons" war' }),
        t('Post-war reconstruction', { id: 'reconstruction', q: 'post-war reconstruction' }),
      ]),
      t('Peace process', { id: 'peace', q: '"peace process" OR "peace talks"', feeds: [F.crisisGroup] }, [
        t('Peace talks', { q: '"peace talks"' }),
        t('Peacekeeping', { q: 'peacekeeping OR peacekeepers' }),
        t('Disarmament', { q: 'disarmament', feeds: [F.armsControl] }),
      ]),
      t('Diplomacy', { q: 'diplomacy', feeds: [F.foreignPolicy, F.diplomat] }, [
        t('Summits', { q: 'summit leaders' }),
        t('Treaties', { q: 'treaty signed' }),
        t('Sanctions', { q: 'sanctions imposed' }),
        t('Border disputes', { q: '"border dispute"' }),
        t('Foreign aid', { q: '"foreign aid"', feeds: [G('global-development/aid')] }),
      ]),
      t('International organizations', { id: 'organizations', q: '"United Nations" OR NATO OR "European Union"' }, [
        ...names(
          ['UN', { q: '"United Nations"', also: ['United Nations'] }],
          ['NATO', { feeds: [G('world/nato')] }],
          ['EU', { q: '"European Union"', also: ['European Union'], feeds: [G('world/eu')] }],
          ['G7/G20', { id: 'g7-g20', q: 'G7 OR G20', feeds: [G('world/g20')] }],
          ['WHO', { q: '"World Health Organization"', also: ['World Health Organization'], feeds: [F.who, G('world/world-health-organization')] }],
          ['IMF', { q: 'IMF "International Monetary Fund"', feeds: [G('business/imf')] }],
          ['World Bank', { q: '"World Bank"' }],
          'BRICS',
          ['African Union', { q: '"African Union"' }],
          ['ASEAN', { feeds: [G('world/asean')] }],
        ),
        t('NGOs', { q: 'NGO OR "non-governmental organization"', feeds: [F.msf, F.oxfam] }),
      ]),
      t('Migration & refugees', { id: 'migration', q: 'migrants OR refugees', feeds: [G('world/refugees')] }, [
        t('Refugees', { q: 'refugees', feeds: [G('world/refugees')] }),
        t('Internally displaced people', { id: 'displaced', q: '"internally displaced" OR "displaced people"' }),
      ]),
      t('Humanitarian crises', { id: 'humanitarian', q: '"humanitarian crisis"', feeds: [F.reliefweb, F.newHumanitarian, F.msf] }, [
        t('Famine', { q: 'famine OR hunger crisis', feeds: [G('world/famine')] }),
        t('Aid', { q: '"humanitarian aid"', feeds: [F.reliefweb] }),
        t('NGOs', { q: 'NGO humanitarian', feeds: [F.msf, F.oxfam] }),
      ]),
      t('Global development', { id: 'development', q: '"global development"', feeds: [G('global-development')] }, [
        t('Poverty reduction', { id: 'poverty', q: '"poverty reduction" OR "extreme poverty"', feeds: [F.oxfam] }),
        t('Aid', { q: '"development aid" OR "aid cuts"', feeds: [G('global-development/aid')] }),
        t('Water access', { id: 'water', q: '"clean water" OR "water access" OR sanitation' }),
      ]),
      t('Elections around the world', { id: 'elections', q: 'election results vote' }),
      t('Terrorism', { q: 'terrorism OR "terror attack"', feeds: [G('world/terrorism'), F.longWarJournal] }),
      t('Ongoing story hubs', { id: 'stories', q: 'world news', hub: true, also: ['one page per big story'] }),
    ],
  },

  // 2 ------------------------------------------------------------------------
  {
    id: 'local',
    title: 'Local & National',
    emoji: '📍',
    icon: 'location-outline',
    section: 'NATION',
    q: '{country}',
    local: true,
    native: {
      fr: [F.francetvinfo, F.rts, F.vingtMinutes],
      de: [F.tagesschau, F.srf],
      it: [F.ansa],
      es: [F.elpais],
      pt: [F.g1, F.rtp],
    },
    kids: [
      t('National news', { id: 'national', q: '{country}' }),
      t('Regions/states/provinces', { id: 'regions', q: '{region}' }),
      t('Cities', { q: '{city}', also: ['user picks'] }),
      t('Local politics', { id: 'politics', q: '{city} council OR mayor' }),
      t('Local events', { id: 'events', q: '{city} events' }),
      t('Traffic & transport', { id: 'traffic', q: '{city} traffic OR transport' }),
      t('Local weather alerts', { id: 'weather', q: '{city} weather warning' }),
      t('Community news', { id: 'community', q: '{city} community' }),
      t("What's on", { id: 'whats-on', q: '{city} "what\'s on" OR concerts OR festival' }, [
        t('Concerts', { q: '{city} concert' }),
        t('Markets', { q: '{city} market' }),
        t('Events near me', { id: 'events', q: '{city} events this weekend' }),
      ]),
      t('Road works & strikes', { id: 'roadworks-strikes', q: '{city} roadworks OR strike' }),
      t('Local jobs', { id: 'jobs', q: '{city} jobs hiring' }),
    ].map((d) => ({ ...d, local: true, kids: d.kids?.map((k) => ({ ...k, local: true })) })),
  },

  // 3 ------------------------------------------------------------------------
  {
    id: 'politics',
    title: 'Politics',
    emoji: '🏛️',
    icon: 'business-outline',
    section: 'NATION',
    q: 'politics',
    feeds: [B('news/politics'), G('politics'), G('us-news/us-politics'), G('australia-news/australian-politics'), F.politico, F.cbsPolitics, F.thehill],
    native: { fr: [F.lemonde, F.liberation], de: [F.tagesschau, F.faz], es: [F.elpais], it: [F.repubblica], pt: [F.folha] },
    kids: [
      t('Elections', { q: 'election', feeds: [F.realclear, G('politics/general-election-2024')] }, [
        t('Campaigns', { q: 'election campaign' }),
        t('Polls', { q: 'opinion poll election' }),
        t('Results', { q: 'election results' }),
        t('Debates', { q: 'election debate' }),
        t('Referendums', { q: 'referendum vote' }),
        t('Primaries', { q: 'primary election OR primaries' }),
        t('Local/regional elections', { id: 'local', q: '"local elections" OR "regional elections"' }),
        t('Campaign finance', { q: '"campaign finance" OR donors election' }),
        t('Voting systems', { q: '"voting system" OR "electoral reform"' }),
      ]),
      t('Government', { q: 'government', feeds: [F.govUk] }, [
        t('Head of state', { q: '"head of state" OR president OR king' }),
        t('Head of government', { q: '"prime minister" OR chancellor OR premier' }),
        t('Ministries', { q: 'ministry minister announces' }),
        t('Executive orders', { q: '"executive order"' }),
        t('Impeachment', { q: 'impeachment' }),
        t('Public inquiries', { q: '"public inquiry"' }),
        t('Lobbying', { q: 'lobbying OR lobbyists', feeds: [G('politics/lobbying')] }),
        t('Constitution', { q: 'constitution amendment OR "constitutional reform"' }),
      ]),
      t('Parliament / Congress / Senate', { id: 'parliament', q: 'parliament OR congress OR senate', feeds: [F.rollcall] }),
      t('Political parties', { id: 'parties', q: '"political party" OR party leader' }),
      t('Laws & legislation', { id: 'legislation', q: 'bill legislation passed law' }),
      t('Supreme / constitutional courts', { id: 'courts', q: '"supreme court" OR "constitutional court"', feeds: [F.scotusblog] }),
      t('Political scandals', { id: 'scandals', q: 'political scandal' }),
      t('Geopolitics', { q: 'geopolitics', feeds: [F.foreignPolicy, F.atlanticCouncil, F.diplomat] }),
      t('Policy areas', { id: 'policy', q: 'policy', each: '{} policy' }, [
        t('Immigration', { q: 'immigration policy', feeds: [G('uk/immigration')] }),
        t('Healthcare', { q: 'healthcare policy', feeds: [F.kffHealthNews] }),
        t('Taxes', { q: 'tax policy OR tax cuts OR tax rise' }),
        t('Education', { q: 'education policy' }),
        t('Environment', { q: 'environmental policy' }),
        t('Defense', { q: 'defense policy OR defence spending' }),
        t('Gun control', { q: '"gun control" OR "gun laws"', feeds: [G('us-news/gun-control')] }),
        t('Data protection', { q: '"data protection" law OR GDPR', feeds: [G('technology/data-protection')] }),
        t('Housing & urban planning', { id: 'housing', q: 'housing policy OR "urban planning"' }),
        t('Pensions & welfare', { id: 'pensions-welfare', q: 'pensions OR welfare reform' }),
        t('Infrastructure', { q: 'infrastructure spending OR infrastructure plan' }),
        t('Nuclear policy', { id: 'nuclear', q: '"nuclear policy" OR "nuclear power" government' }),
        t('Indigenous peoples', { id: 'indigenous', q: 'indigenous rights policy', feeds: [G('world/indigenous-peoples')] }),
        t('Industry regulation', { id: 'regulation', q: 'regulator industry regulation' }),
        t('Culture policy', { id: 'culture', q: '"arts funding" OR "culture minister"' }),
        t('Sports policy', { id: 'sports', q: '"sports minister" OR "sports policy"' }),
      ]),
      t('Political prisoners & dissidents', { id: 'dissidents', q: '"political prisoner" OR dissident', feeds: [F.hrw, F.amnesty] }),
    ],
  },

  // 4 ------------------------------------------------------------------------
  {
    id: 'defense',
    title: 'Defense & Security',
    emoji: '🛡️',
    icon: 'shield-outline',
    q: 'military OR defense OR security',
    feeds: [F.defenseNews, F.breakingDefense, F.defenseOne, F.militaryTimes, F.warOnTheRocks, F.justSecurity],
    kids: [
      t('Military & armed forces', { id: 'military', q: 'military OR "armed forces"', feeds: [F.militaryTimes] }),
      t('Weapons & defense industry', { id: 'weapons', q: 'weapons OR "defense contractor" OR "arms deal"', feeds: [F.defenseNews, F.breakingDefense] }),
      t('Intelligence agencies', { id: 'intelligence', q: 'intelligence agency OR CIA OR MI6 OR spy', feeds: [G('world/espionage')] }),
      t('Cyberwarfare', { q: 'cyberwarfare OR "state-sponsored hackers" OR "cyber attack"', feeds: [F.theRecord] }),
      t('Nuclear weapons', { id: 'nuclear', q: '"nuclear weapons" OR "nuclear arsenal"', feeds: [G('world/nuclear-weapons'), F.armsControl] }),
      t('Terrorism & counter-terrorism', { id: 'terrorism', q: 'terrorism OR counterterrorism', feeds: [F.longWarJournal, G('world/terrorism')] }),
      t('Border security', { id: 'borders', q: '"border security" OR "border patrol"' }),
      t('National security', { q: '"national security"', feeds: [F.justSecurity] }),
      t('Surveillance', { q: 'surveillance', feeds: [G('world/surveillance'), F.eff] }),
    ],
  },

  // 5 ------------------------------------------------------------------------
  {
    id: 'business',
    title: 'Business',
    emoji: '💼',
    icon: 'briefcase-outline',
    section: 'BUSINESS',
    q: 'business',
    feeds: [B('news/business'), G('business'), F.fortune, F.fastco, F.cbsMoney, F.marketwatch],
    native: { fr: [F.lefigaro], de: [F.faz] },
    kids: [
      t('Companies', { q: 'company', feeds: [F.fortune] }, [
        t('Earnings', { q: 'quarterly earnings OR "earnings report"' }),
        t('CEOs & leadership', { id: 'ceos', q: 'CEO' }),
        t('Mergers & acquisitions', { id: 'mergers', q: 'merger OR acquisition OR takeover', feeds: [G('business/mergers-and-acquisitions')] }),
        t('Bankruptcies', { q: 'bankruptcy OR insolvency' }),
        t('Layoffs', { q: 'layoffs OR "job cuts"' }),
        t('Corporate governance', { id: 'governance', q: '"corporate governance" OR shareholders board', feeds: [G('business/corporate-governance')] }),
        t('Restructuring', { q: 'restructuring company' }),
        t('Human resources', { id: 'hr', q: '"human resources" OR HR', feeds: [dive('hrdive')] }),
      ]),
      t('Startups & venture capital', { id: 'startups', q: 'startup funding OR "venture capital"', feeds: [F.techcrunch, F.crunchbase, F.sifted, F.euStartups] }),
      t('Small business & entrepreneurship', { id: 'small-business', q: '"small business" OR entrepreneurs', feeds: [F.inc, F.entrepreneur] }),
      t('Cooperatives', { q: 'cooperative OR co-op', feeds: [F.shareable] }),
      t('Sharing economy', { q: '"sharing economy" OR Airbnb OR Uber', feeds: [F.shareable] }),
      ...group('Industries', [
        t('Energy', { q: 'energy industry', feeds: [G('business/energy-industry'), F.oilprice] }, [
          t('Oil & gas', { id: 'oil-gas', q: 'oil gas industry OR OPEC', feeds: [F.oilprice, F.rigzone, G('business/oil')] }),
          t('Renewables', { q: 'renewable energy industry OR solar OR wind power', feeds: [G('environment/renewableenergy'), F.renewableEnergyWorld, F.pvMagazine, F.canaryMedia] }),
          t('Nuclear', { q: '"nuclear power" OR "nuclear plant"', feeds: [F.worldNuclearNews] }),
        ]),
        t('Automotive', { q: 'carmakers OR "auto industry"', feeds: [G('business/automotive-industry'), dive('automotivedive')] }),
        t('Aviation & aerospace', { id: 'aviation', q: 'airline OR aerospace OR Boeing OR Airbus', feeds: [F.simpleFlying, F.flightglobal, F.aerotime, F.airlinegeeks, G('world/air-transport')] }),
        t('Retail & e-commerce', { id: 'retail', q: 'retail OR e-commerce OR retailer', feeds: [dive('retaildive'), G('business/retail'), dive('grocerydive')] }),
        t('Telecom', { q: 'telecom OR telecoms operator', feeds: [G('business/telecoms'), F.lightReading, F.rcrWireless] }),
        t('Pharma & biotech', { id: 'pharma', q: 'pharmaceutical OR biotech company', feeds: [F.statnews, dive('biopharmadive'), G('business/pharmaceuticals-industry'), F.genengnews] }),
        t('Agriculture', { q: 'agriculture OR farmers OR farming', feeds: [G('environment/farming')] }),
        t('Manufacturing', { q: 'manufacturing OR factory output', feeds: [dive('manufacturingdive'), G('business/manufacturing-sector')] }),
        t('Media & advertising', { id: 'media', q: 'media company OR advertising', feeds: [dive('marketingdive'), F.adweek, G('media')] }),
        t('Transport & logistics', { id: 'logistics', q: 'logistics OR freight OR shipping', feeds: [dive('supplychaindive'), dive('truckingdive')] }),
        t('Luxury', { q: 'luxury brands OR LVMH OR Hermès', feeds: [F.luxuryDaily, F.wwd] }),
        t('Food & beverage', { id: 'food', q: '"food industry" OR "beverage"', feeds: [dive('fooddive'), dive('restaurantdive')] }),
        t('Tourism & hospitality', { id: 'tourism', q: 'tourism OR hotels industry', feeds: [F.skift, dive('hoteldive')] }),
        t('Chemicals', { q: '"chemical industry" OR chemicals company' }),
        t('Mining & metals', { id: 'mining', q: 'mining OR metals', feeds: [F.mining, G('business/mining')] }),
        t('Forestry & timber', { id: 'forestry', q: 'forestry OR timber OR lumber', feeds: [F.forestnet, F.woodworkingNetwork] }),
        t('Fishing & aquaculture', { id: 'fishing', q: 'fisheries OR aquaculture OR "fishing industry"', feeds: [F.fishingWorld] }),
        t('Plastics & packaging', { id: 'packaging', q: 'plastics OR packaging industry', feeds: [dive('packagingdive'), F.plasticsToday, F.packagingGateway] }),
        t('Utilities', { q: 'utilities OR "utility company"', feeds: [dive('utilitydive')] }, [
          t('Water', { q: '"water company" OR "water utility"' }),
          t('Electricity', { q: 'electricity grid OR power utility', feeds: [dive('utilitydive')] }),
        ]),
        t('Construction', { q: 'construction industry', feeds: [dive('constructiondive'), F.constructionNews, G('business/construction')] }),
        t('Healthcare industry', { id: 'healthcare', q: 'healthcare industry OR hospitals company', feeds: [dive('healthcaredive'), F.fiercehealthcare, dive('medtechdive')] }),
        t('Consumer goods', { q: '"consumer goods" OR Unilever OR Nestlé OR "Procter & Gamble"' }),
        t('Maritime & shipping', { id: 'shipping', q: 'shipping OR maritime OR container ships', feeds: [F.gcaptain] }),
        t('Defense industry', { id: 'defense', q: '"defense industry" OR "defence contractor"', feeds: [F.defenseNews, F.breakingDefense] }),
      ]),
      t('Marketing & advertising', { id: 'marketing', q: 'marketing OR advertising', feeds: [dive('marketingdive'), F.adweek] }),
    ],
  },

  // 6 ------------------------------------------------------------------------
  {
    id: 'economy',
    title: 'Economy',
    emoji: '📈',
    icon: 'stats-chart-outline',
    section: 'BUSINESS',
    q: 'economy',
    feeds: [G('business/economics'), F.economistFinance, G('business/global-economy'), F.cbsMoney],
    kids: [
      t('Inflation', { q: 'inflation', feeds: [G('business/inflation')] }),
      t('Interest rates', { q: '"interest rates"', feeds: [G('business/interest-rates')] }),
      t('GDP & growth', { id: 'gdp', q: 'GDP OR "economic growth"' }),
      t('Unemployment & jobs data', { id: 'jobs-data', q: '"unemployment rate" OR "jobs report" OR payrolls' }),
      t('Recession', { q: 'recession', feeds: [G('business/recession')] }),
      t('Trade & tariffs', { id: 'trade', q: 'tariffs OR "trade deal" OR "trade war"', feeds: [G('business/tariffs')] }),
      t('Supply chains', { q: '"supply chain"', feeds: [dive('supplychaindive')] }),
      t('Consumer spending', { q: '"consumer spending" OR "retail sales"' }),
      t('Housing market', { q: '"housing market"' }),
      t('Government budgets & debt', { id: 'budgets', q: 'budget deficit OR "national debt"' }),
      t('Global economy', { q: '"global economy"', feeds: [G('business/global-economy')] }),
      t('Emerging markets', { q: '"emerging markets"' }),
      t('Monetary policy', { q: '"monetary policy" OR "central bank"', feeds: [F.fed, F.ecb, F.boe] }),
      t('Economic sanctions', { id: 'sanctions', q: 'sanctions economy' }),
    ],
  },

  // 7 ------------------------------------------------------------------------
  {
    id: 'finance',
    title: 'Finance & Markets',
    emoji: '💰',
    icon: 'trending-up-outline',
    section: 'BUSINESS',
    q: 'stock market OR markets',
    feeds: [F.marketwatch, F.investing, F.ft, G('business/stock-markets')],
    kids: [
      t('Stock markets', { id: 'stocks', q: '"stock market" OR stocks', feeds: [G('business/stock-markets'), F.marketwatch] }, [
        ...group('Indices', [
          ...names(
            ['S&P 500', { id: 'sp500', q: '"S&P 500"' }],
            'Nasdaq',
            ['Dow', { q: '"Dow Jones"', also: ['Dow Jones'] }],
            ['CAC 40', { q: '"CAC 40"' }],
            'DAX',
            ['FTSE', { q: '"FTSE 100"', also: ['FTSE 100'] }],
            ['Nikkei', { q: 'Nikkei 225' }],
            ['Euro Stoxx 50', { q: '"Euro Stoxx"' }],
            ['SMI', { q: '"Swiss Market Index" OR SMI stocks' }],
            ['Hang Seng', { q: '"Hang Seng"' }],
            ['Sensex', { q: 'Sensex OR Nifty' }],
            ['TSX', { q: 'TSX stocks' }],
            ['ASX 200', { q: '"ASX 200"' }],
          ),
        ]),
        t('Individual stocks', { id: 'individual', q: 'shares stock price' }),
        t('IPOs', { q: 'IPO OR "initial public offering"' }),
      ]),
      t('Bonds & treasuries', { id: 'bonds', q: 'bonds OR treasuries OR "bond yields"' }),
      t('Loan & debt markets', { id: 'debt', q: '"private credit" OR "leveraged loans" OR "debt markets"' }),
      t('Forex / currencies', { id: 'forex', q: 'forex OR currency dollar euro', feeds: [F.forexlive, G('business/currencies')] }),
      t('Commodities', { q: 'commodities' }, [
        t('Oil', { q: '"oil prices" OR Brent', feeds: [F.oilprice] }),
        t('Gold', { q: '"gold price"', feeds: [G('business/gold')] }),
        t('Silver', { q: '"silver price"' }),
        t('Gas', { q: '"natural gas" prices' }),
        t('Agricultural products', { id: 'agricultural', q: 'wheat OR corn OR soybeans OR coffee prices' }),
      ]),
      t('Crypto', { q: 'crypto OR cryptocurrency', feeds: [F.coindesk, F.cointelegraph, G('technology/cryptocurrencies')] }, [
        ...names('Bitcoin', 'Ethereum'),
        t('Altcoins', { q: 'altcoins OR Solana OR XRP OR Cardano' }),
        t('DeFi', { q: 'DeFi "decentralized finance"' }),
        t('NFTs', { q: 'NFT OR NFTs' }),
        t('Regulation', { q: 'crypto regulation' }),
        t('Blockchain', { q: 'blockchain' }),
      ]),
      t('Central banks', { q: '"central bank"', feeds: [F.fed, F.ecb, F.boe] }, [
        ...names(
          ['Fed', { q: '"Federal Reserve"', also: ['Federal Reserve'], feeds: [F.fed, G('business/federal-reserve')] }],
          ['ECB', { q: '"European Central Bank"', also: ['European Central Bank'], feeds: [F.ecb, G('business/european-central-bank')] }],
          ['Bank of England', { q: '"Bank of England"', feeds: [F.boe, G('business/bankofenglandgovernor')] }],
          ['BoJ', { q: '"Bank of Japan"', also: ['Bank of Japan'] }],
          ['SNB', { q: '"Swiss National Bank"', also: ['Swiss National Bank'] }],
          ['PBoC', { q: '"People\'s Bank of China"', also: ["People's Bank of China"] }],
          ['RBI', { q: '"Reserve Bank of India"', also: ['Reserve Bank of India'] }],
          ['Bank of Canada', { q: '"Bank of Canada"' }],
        ),
      ]),
      t('Banking & fintech', { id: 'banking', q: 'banks OR fintech', feeds: [dive('bankingdive'), dive('paymentsdive'), G('business/banking')] }),
      t('Funds & ETFs', { id: 'funds', q: 'ETF OR "hedge fund" OR "mutual fund"' }),
      t('Personal finance', { id: 'personal', q: '"personal finance"', feeds: [G('money'), F.kiplinger, F.nerdwallet] }, [
        t('Budgeting', { q: 'budgeting money tips' }),
        t('Saving', { q: 'savings accounts OR saving money', feeds: [G('money/savings')] }),
        t('Investing', { q: 'investing tips OR investors' }),
        t('Retirement', { q: 'retirement savings OR 401(k)', feeds: [G('money/pensions')] }),
        t('Taxes', { q: 'tax return OR "income tax"', feeds: [G('money/tax')] }),
        t('Mortgages & loans', { id: 'mortgages', q: 'mortgage rates OR loans', feeds: [G('money/mortgages')] }),
        t('Credit cards', { q: '"credit card"' }),
        t('Insurance', { q: 'insurance premiums OR insurers', feeds: [G('money/insurance')] }),
        t('Real estate investing', { id: 'real-estate', q: '"real estate investing" OR "property investors"' }),
        t('Scams & fraud alerts', { id: 'scams', q: 'scam warning OR fraud alert' }),
        t('Consumer rights', { q: '"consumer rights" OR refund OR "consumer protection"' }),
      ]),
    ],
  },

  // 8 ------------------------------------------------------------------------
  {
    id: 'tech',
    title: 'Technology',
    emoji: '💻',
    icon: 'hardware-chip-outline',
    section: 'TECHNOLOGY',
    q: 'technology',
    feeds: [F.verge, F.ars, F.techcrunch, F.engadget, F.wired, B('news/technology'), G('technology'), F.theRegister, F.zdnet, F.cbsTech],
    native: {},
    kids: [
      t('AI', { q: '"artificial intelligence" OR AI', also: ['artificial intelligence'], feeds: [G('technology/artificialintelligenceai'), F.mitTech, F.wiredAi] }, [
        t('Generative AI', { q: '"generative AI"' }),
        t('Chatbots', { q: 'chatbot OR ChatGPT OR Claude OR Gemini', feeds: [G('technology/chatgpt')] }),
        t('AI regulation', { id: 'regulation', q: '"AI regulation" OR "AI act" OR "AI safety"' }),
        t('AI research', { id: 'research', q: '"AI research" OR "AI model"' }),
        t('AI in business', { id: 'business', q: 'AI business adoption OR enterprise AI', feeds: [dive('ciodive')] }),
      ]),
      t('Big tech', { q: 'Apple OR Google OR Microsoft OR Meta OR Amazon OR Nvidia' }, [
        ...names(
          ['Apple', { feeds: [G('technology/apple'), F.mac9to5, F.macrumors] }],
          ['Google', { feeds: [G('technology/google'), F.google9to5] }],
          ['Microsoft', { feeds: [G('technology/microsoft')] }],
          ['Meta', { q: 'Meta Facebook OR Instagram OR WhatsApp', feeds: [G('technology/facebook')] }],
          ['Amazon', { feeds: [G('technology/amazon')] }],
          ['Nvidia', { feeds: [G('technology/nvidia')] }],
          ['Tesla', { feeds: [G('technology/tesla'), F.electrek] }],
          ['Samsung', { feeds: [G('technology/samsung')] }],
          ['OpenAI', {}],
        ),
      ]),
      t('Smartphones & gadgets', { id: 'gadgets', q: 'smartphone OR gadget', feeds: [G('technology/smartphones'), G('technology/gadgets'), F.arsGadgets, F.androidAuthority] }),
      t('Computers & hardware', { id: 'hardware', q: 'PC OR laptop OR hardware', feeds: [G('technology/computing'), F.tomsHardware] }),
      t('Semiconductors & chips', { id: 'chips', q: 'semiconductors OR chipmaker OR chips TSMC', feeds: [F.semiEngineering] }),
      t('Software & apps', { id: 'software', q: 'software OR app update' }),
      t('Wearables', { q: 'wearables OR smartwatch', feeds: [G('technology/wearable-technology')] }),
      t('Internet of Things & smart home', { id: 'smart-home', q: '"smart home" OR "Internet of Things" OR IoT' }),
      t('Cybersecurity', { q: 'cybersecurity', feeds: [F.bleeping, F.krebs, F.theRecord, F.darkReading, F.securityWeek, dive('cybersecuritydive'), G('technology/data-computer-security')] }, [
        t('Hacks', { q: 'hackers OR hacked OR ransomware', feeds: [G('technology/hacking'), F.bleeping] }),
        t('Data breaches', { id: 'breaches', q: '"data breach"', feeds: [F.databreaches] }),
        t('Privacy', { q: 'privacy data tech', feeds: [F.eff, G('world/privacy')] }),
      ]),
      t('Social media', { q: '"social media" OR TikTok OR Instagram OR X', feeds: [F.socialMediaToday, F.platformer] }),
      t('Internet & web culture', { id: 'internet', q: 'internet culture OR online', feeds: [G('technology/internet'), F.dailyDot] }),
      t('Telecom & 5G', { id: 'telecom', q: '5G OR telecom OR broadband', feeds: [F.rcrWireless, F.lightReading] }),
      t('Robotics & automation', { id: 'robotics', q: 'robots OR robotics OR automation', feeds: [G('technology/robots'), F.robotReport] }),
      t('Quantum computing', { id: 'quantum', q: '"quantum computing" OR "quantum computer"', feeds: [F.quantumInsider] }),
      t('AR / VR / metaverse', { id: 'xr', q: '"virtual reality" OR "augmented reality" OR metaverse OR "Vision Pro"', feeds: [G('technology/virtual-reality'), F.roadToVr, F.uploadVr] }),
      t('Space tech & satellites', { id: 'space', q: 'satellites OR "space tech" OR Starlink', feeds: [F.spaceNews] }),
      t('Biotech', { q: 'biotech OR biotechnology', feeds: [F.statBiotech, F.genengnews] }),
      t('Identification tech', { id: 'identification', q: '"digital ID" OR biometrics OR "facial recognition"', feeds: [F.biometricUpdate] }, [
        t('Biometrics', { q: 'biometrics OR "facial recognition" OR fingerprint', feeds: [F.biometricUpdate] }),
      ]),
      t('Tech policy & regulation', { id: 'policy', q: 'tech regulation OR "big tech"', feeds: [F.arsPolicy, F.eff] }, [
        t('Antitrust', { q: 'antitrust tech OR "competition law"' }),
        t('Data laws', { q: '"data protection" OR GDPR OR "privacy law"', feeds: [G('technology/data-protection')] }),
      ]),
      t('Product reviews & deals', { id: 'reviews', q: 'review OR deals tech', feeds: [F.engadget, F.slickdeals] }),
      t('Developers & programming', { id: 'developers', q: 'programming OR developers OR "open source"', feeds: [F.githubBlog, F.stackOverflowBlog, F.infoq, F.devTo] }),
    ],
  },

  // 9 ------------------------------------------------------------------------
  {
    id: 'science',
    title: 'Science',
    emoji: '🔬',
    icon: 'flask-outline',
    section: 'SCIENCE',
    q: 'science study',
    feeds: [F.sciencedaily, F.phys, F.livescience, G('science'), F.nature, F.sciencenews, F.sciam, F.quanta, F.arsScience, F.wiredScience, F.smithsonian, F.cbsScience, B('news/science_and_environment')],
    kids: [
      t('Space & astronomy', { id: 'space', q: 'space OR astronomy', feeds: [F.space, F.nasa, F.esa, G('science/space'), G('science/astronomy'), F.nasaSpaceflight] }, [
        ...names(['NASA', { feeds: [F.nasa, F.nasaBreaking, G('science/nasa')] }], ['ESA', { q: '"European Space Agency"', feeds: [F.esa] }], ['SpaceX', { feeds: [G('science/spacex'), F.nasaSpaceflight] }]),
        t('Missions', { q: 'space mission OR launch', feeds: [F.nasaSpaceflight] }),
        t('Planets', { q: 'planet Mars OR Jupiter OR Venus' }),
        t('Exoplanets', { q: 'exoplanet' }),
        t('Cosmology', { q: 'cosmology OR "dark matter" OR "big bang"' }),
      ]),
      t('Natural sciences', { id: 'natural', q: 'science research' }, [
        t('Physics', { q: 'physics', feeds: [G('science/physics'), F.quanta] }),
        t('Biology & genetics', { id: 'biology', q: 'biology OR genetics OR DNA', feeds: [G('science/biology'), G('science/genetics'), G('science/evolution')] }),
        t('Chemistry', { q: 'chemistry chemists', feeds: [G('science/chemistry')] }),
        ...group('Earth science', [
          t('Geology', { q: 'geology OR geologists', feeds: [G('science/geology')] }),
          t('Volcanoes', { q: 'volcano', feeds: [G('world/volcanoes')] }),
          t('Earthquakes', { q: 'earthquake', feeds: [F.usgs, G('world/earthquakes')] }),
        ]),
        t('Meteorology', { q: 'meteorology OR meteorologists' }),
        t('Oceans & marine science', { id: 'oceans', q: 'ocean scientists OR marine biology', feeds: [G('environment/oceans')] }),
        t('Botany & horticulture', { id: 'botany', q: 'botany OR plants scientists OR horticulture' }),
      ]),
      t('Archaeology & paleontology', { id: 'archaeology', q: 'archaeology OR archaeologists OR fossil OR dinosaur', feeds: [G('science/archaeology'), G('science/palaeontology'), G('science/dinosaurs'), F.ancientOrigins] }),
      t('Mathematics', { q: 'mathematics OR mathematicians', feeds: [G('science/mathematics'), F.quanta] }),
      t('Social sciences', { id: 'social', q: 'study researchers society' }, [
        t('Psychology', { q: 'psychology study', feeds: [G('science/psychology'), F.psychToday] }),
        t('Sociology', { q: 'sociology OR sociologists' }),
        t('Anthropology', { q: 'anthropology', feeds: [G('science/anthropology'), F.anthropologyNews] }),
        t('Economics', { q: 'economists study OR "economic research"' }),
        t('Linguistics', { q: 'linguistics OR linguists OR language study' }),
        t('Geography', { q: 'geography OR geographers' }),
        t('History', { q: 'historians OR history discovery', feeds: [F.smithsonian] }),
        t('Philosophy', { q: 'philosophy OR philosopher', feeds: [G('world/philosophy'), F.aeon] }),
        t('Political science', { id: 'political', q: '"political science" OR "political scientists"' }),
      ]),
      t('Engineering', { q: 'engineering engineers', feeds: [F.ieeeSpectrum], each: '{} engineering' }, [
        t('Aerospace', { q: '"aerospace engineering" OR aircraft design' }),
        t('Civil', { q: '"civil engineering" OR bridge OR tunnel construction' }),
        t('Mechanical', { q: '"mechanical engineering"' }),
        t('Electronics', { q: 'electronics engineering', feeds: [F.ieeeSpectrum] }),
        t('Materials science', { id: 'materials', q: '"materials science" OR "new material"' }),
      ]),
      t('Research & discoveries', { id: 'discoveries', q: 'scientists discover OR breakthrough', feeds: [F.sciencedaily, F.phys] }),
      t('Scientific exploration', { id: 'exploration', q: 'expedition scientists' }, [
        t('Expeditions', { q: 'expedition' }),
        t('Polar research', { id: 'polar', q: 'Antarctic OR Arctic research', feeds: [F.antarctica] }),
      ]),
      t('Science policy', { id: 'policy', q: '"science policy" OR "science funding"', feeds: [G('science/science-policy')] }),
    ],
  },

  // 10 -----------------------------------------------------------------------
  {
    id: 'health',
    title: 'Health',
    emoji: '🏥',
    icon: 'medkit-outline',
    section: 'HEALTH',
    q: 'health',
    feeds: [B('news/health'), G('society/health'), F.statnews, F.sdHealth, F.who, F.medicalXpress, F.cbsHealth],
    kids: [
      t('Medical research & breakthroughs', { id: 'research', q: '"medical research" OR "clinical trial"', feeds: [G('science/medical-research'), F.medicalXpress] }),
      t('Diseases & conditions', { id: 'conditions', q: 'disease' }, [
        t('Cancer', { q: 'cancer', feeds: [G('society/cancer')] }),
        t('Heart disease', { id: 'heart', q: '"heart disease" OR cardiovascular', feeds: [G('society/heart-disease')] }),
        t('Diabetes', { q: 'diabetes', feeds: [G('society/diabetes')] }),
        t("Alzheimer's", { id: 'alzheimers', q: "Alzheimer's OR dementia", feeds: [G('society/dementia')] }),
        t('Infectious diseases', { id: 'infectious', q: '"infectious disease" OR outbreak OR virus' }),
        ...group('Developmental disorders', [t('Autism', { q: 'autism', feeds: [G('society/autism')] }), t('ADHD', { q: 'ADHD', name: true })]),
        t('Injuries', { q: 'injuries OR injury prevention' }),
      ]),
      t('Mental health', { id: 'mental', q: '"mental health"', feeds: [G('society/mental-health'), F.psychToday] }),
      t('Public health & pandemics', { id: 'public', q: '"public health" OR pandemic', feeds: [F.who] }),
      t('Vaccines', { q: 'vaccine OR vaccination' }),
      t('Healthcare systems & policy', { id: 'systems', q: '"health system" OR "health policy"', feeds: [F.kffHealthNews, G('society/nhs'), dive('healthcaredive')] }, [
        t('Hospitals & clinics', { id: 'hospitals', q: 'hospital OR clinic' }),
        t('Health insurance', { id: 'insurance', q: '"health insurance"' }),
        ...group('Medical professions', [t('Doctors', { q: 'doctors', feeds: [G('society/doctors')] }), t('Nurses', { q: 'nurses', feeds: [G('society/nursing')] })]),
      ]),
      t('Treatments', { q: 'treatment patients' }, [
        t('Surgery', { q: 'surgery OR surgeons' }),
        t('Therapies', { q: 'therapy OR "new treatment"' }),
        t('Emergency care', { id: 'emergency', q: '"emergency room" OR "A&E" OR ambulance' }),
        t('Medical tests', { id: 'tests', q: '"blood test" OR screening OR diagnosis test' }),
      ]),
      t('Drugs & pharma', { id: 'drugs', q: 'drug OR pharmaceutical', feeds: [F.statnews, F.drugsCom, F.fda] }, [
        t('Approvals', { q: 'FDA approval OR "drug approved"', feeds: [F.fda, F.drugsCom] }),
        t('Prices', { q: '"drug prices"' }),
      ]),
      t('Addiction & rehab', { id: 'addiction', q: 'addiction OR rehab OR overdose', feeds: [G('society/drugs')] }),
      t('Nutrition & diet', { id: 'nutrition', q: 'nutrition OR diet', feeds: [G('society/obesity')] }),
      t('Fitness & exercise', { id: 'fitness', q: 'exercise OR fitness', feeds: [G('lifeandstyle/fitness'), F.runnersWorld, F.mensHealth] }),
      t('Sleep', { q: 'sleep health OR insomnia', feeds: [G('lifeandstyle/sleep')] }),
      t('By group', { id: 'groups', q: 'health', each: "{} health" }, [
        t("Women's", { id: 'women', q: '"women\'s health" OR menopause' }),
        t("Men's", { id: 'men', q: '"men\'s health"', feeds: [F.mensHealth] }),
        t("Children's", { id: 'children', q: '"children\'s health" OR paediatric' }),
        t("Seniors' & aging", { id: 'aging', q: 'aging OR elderly health', feeds: [G('society/older-people')] }),
        t('Sexual & reproductive', { id: 'reproductive', q: '"reproductive health" OR "sexual health" OR abortion OR IVF' }),
      ]),
      t('Wellness', { q: 'wellness OR wellbeing', feeds: [G('lifeandstyle/health-and-wellbeing')] }),
    ],
  },

  // 11 -----------------------------------------------------------------------
  {
    id: 'environment',
    title: 'Environment & Climate',
    emoji: '🌱',
    icon: 'leaf-outline',
    q: 'environment OR climate',
    feeds: [G('environment'), F.carbonBrief, F.insideClimate, F.mongabay, F.earthCom],
    kids: [
      t('Climate change', { id: 'climate', q: '"climate change" OR "global warming"', feeds: [G('environment/climate-crisis'), G('science/scienceofclimatechange'), F.carbonBrief] }),
      t('Climate policy', { id: 'policy', q: '"climate policy" OR "net zero"', feeds: [F.carbonBrief] }, [
        t('COP', { q: 'COP climate summit', name: true, feeds: [G('environment/cop29')] }),
        t('Paris Agreement', { q: '"Paris Agreement"', name: true, feeds: [G('environment/paris-climate-agreement')] }),
      ]),
      t('Renewable energy', { id: 'renewables', q: '"renewable energy"', feeds: [G('environment/renewableenergy'), F.cleantechnica, F.canaryMedia] }),
      t('Pollution', { q: 'pollution', feeds: [G('environment/pollution')] }, [
        t('Air', { q: '"air pollution"' }),
        t('Water', { q: '"water pollution" OR sewage', feeds: [G('environment/water')] }),
        t('Plastic', { q: '"plastic pollution"', feeds: [G('environment/plastic')] }),
      ]),
      t('Waste & recycling', { id: 'waste', q: 'recycling OR waste', feeds: [G('environment/recycling'), dive('wastedive')] }),
      t('Hazardous materials', { id: 'hazardous', q: '"hazardous materials" OR "toxic chemicals" OR PFAS' }),
      t('Biodiversity & wildlife', { id: 'biodiversity', q: 'biodiversity OR wildlife', feeds: [G('environment/biodiversity'), G('environment/wildlife'), F.mongabay] }),
      t('Endangered & invasive species', { id: 'species', q: '"endangered species" OR "invasive species"' }),
      t('Conservation', { q: 'conservation', feeds: [G('environment/conservation'), F.mongabay] }),
      t('Nature reserves & parks', { id: 'parks', q: '"national park" OR "nature reserve"' }),
      t('Deforestation', { q: 'deforestation', feeds: [G('environment/deforestation')] }),
      t('Oceans', { q: 'ocean environment', feeds: [G('environment/oceans')] }),
      t('Rivers', { q: 'river environment', feeds: [G('environment/rivers')] }),
      t('Wetlands & mountains', { id: 'wetlands-mountains', q: 'wetlands OR glaciers OR mountains environment' }),
      t('Natural resources', { id: 'resources', q: '"natural resources"' }, [
        t('Water', { q: 'water shortage OR "water resources"', feeds: [G('environment/water')] }),
        t('Land', { q: '"land use" OR soil degradation' }),
      ]),
      t('Sustainability & green living', { id: 'sustainability', q: 'sustainability OR "sustainable living"', feeds: [dive('esgdive')] }),
      t('Animals', { q: 'animals', feeds: [G('world/animals')] }),
    ],
  },

  // 12 -----------------------------------------------------------------------
  {
    id: 'disasters',
    title: 'Disasters & Accidents',
    emoji: '🚨',
    icon: 'warning-outline',
    q: 'disaster OR accident',
    feeds: [F.gdacs, F.reliefweb, G('world/natural-disasters')],
    kids: [
      t('Natural disasters', { id: 'natural', q: '"natural disaster"', feeds: [F.gdacs, G('world/natural-disasters')] }, [
        t('Earthquakes', { q: 'earthquake', feeds: [F.usgs, G('world/earthquakes')] }),
        t('Floods', { q: 'floods OR flooding' }),
        t('Wildfires', { q: 'wildfire OR bushfire', feeds: [G('world/wildfires')] }),
        t('Hurricanes', { q: 'hurricane OR typhoon OR cyclone', feeds: [G('world/hurricanes'), F.nhc] }),
        t('Tsunamis', { q: 'tsunami' }),
        t('Volcanoes', { q: 'volcano eruption', feeds: [G('world/volcanoes')] }),
        t('Droughts', { q: 'drought' }),
        t('Famine', { q: 'famine', feeds: [G('world/famine')] }),
      ]),
      t('Accidents', { q: 'accident OR crash' }, [
        t('Plane crashes', { q: '"plane crash" OR "air crash"', feeds: [F.simpleFlying] }),
        t('Train accidents', { id: 'train', q: 'train crash OR derailment' }),
        t('Road accidents', { id: 'road', q: '"car crash" OR "road accident" OR collision' }),
        t('Maritime accidents', { id: 'maritime', q: 'ship sinks OR capsized OR "maritime accident"', feeds: [F.gcaptain] }),
        t('Explosions', { q: 'explosion blast' }),
        t('Industrial accidents', { id: 'industrial', q: '"industrial accident" OR factory fire OR "chemical leak"' }),
        t('Building collapses', { id: 'collapses', q: '"building collapse" OR collapsed building' }),
        t('Drownings', { q: 'drowned OR drowning' }),
      ]),
      t('Emergency response & rescue', { id: 'rescue', q: 'rescue OR "emergency services" OR evacuation' }),
    ],
  },

  // 13 -----------------------------------------------------------------------
  {
    id: 'weather',
    title: 'Weather',
    emoji: '☀️',
    icon: 'partly-sunny-outline',
    q: 'weather',
    feeds: [F.severeWeather, F.metOffice, F.nhc],
    kids: [
      t('Daily forecasts', { id: 'forecasts', q: 'weather forecast' }),
      t('Severe weather alerts', { id: 'alerts', q: '"weather warning" OR "severe weather"', feeds: [F.metOffice, F.severeWeather] }),
      t('Storms & hurricanes', { id: 'storms', q: 'storm OR hurricane', feeds: [F.nhc, G('world/hurricanes')] }),
      t('Heatwaves', { q: 'heatwave' }),
      t('Cold & snow', { id: 'cold', q: 'snow OR "cold snap" OR blizzard' }),
      t('Seasonal outlooks', { id: 'seasonal', q: '"seasonal forecast" OR "winter outlook" OR "summer outlook"' }),
      t('Weather records & statistics', { id: 'records', q: '"weather record" OR "hottest" OR "record temperature"' }),
      t('Air quality & pollen', { id: 'air-quality', q: '"air quality" OR "pollen count"' }),
      t('UV index', { id: 'uv', q: '"UV index"' }),
    ],
  },

  // 14 -----------------------------------------------------------------------
  {
    id: 'sports',
    title: 'Sports',
    emoji: '⚽',
    icon: 'football-outline',
    section: 'SPORTS',
    q: 'sport',
    feeds: [B('sport'), G('sport'), F.espnTop],
    native: { fr: [F.lequipe], de: [F.kicker], es: [F.marca], it: [F.gazzetta] },
    kids: [
      t('Football / soccer', { id: 'football', q: 'football soccer', feeds: [B('sport/football'), G('football'), F.skyFootball, espn('soccer')] }, [
        ...group('Leagues', [
          ...names(
            ['Premier League', { feeds: [B('sport/football/premier-league'), G('football/premierleague')] }],
            ['La Liga', { feeds: [G('football/laligafootball')] }],
            ['Ligue 1', { feeds: [G('football/ligue1football')] }],
            ['Serie A', { q: '"Serie A" football', feeds: [G('football/serieafootball')] }],
            ['Bundesliga', { feeds: [G('football/bundesligafootball')] }],
            ['MLS', { q: 'MLS soccer', feeds: [G('football/mls')] }],
            ['Saudi Pro League', { q: '"Saudi Pro League"' }],
            ['Liga MX', { q: '"Liga MX"' }],
          ),
        ]),
        ...group('Club competitions', [
          ...names(['Champions League', { feeds: [B('sport/football/champions-league'), G('football/championsleague')] }], ['Europa League', { feeds: [G('football/uefa-europa-league')] }]),
        ]),
        ...group('International tournaments', [
          ...names(
            ['World Cup', { q: '"World Cup" football', feeds: [G('football/world-cup-2026'), B('sport/football/world-cup')] }],
            ['Euros', { q: '"Euro 2028" OR "UEFA Euro"' }],
            ['Copa América', { q: '"Copa America"' }],
            ['AFCON', { q: '"Africa Cup of Nations" OR AFCON', also: ['Africa Cup of Nations'] }],
          ),
        ]),
        t("Women's football", { id: 'womens', q: '"women\'s football" OR WSL OR NWSL', feeds: [G('football/womensfootball'), B('sport/football/womens')] }),
        t('Transfers', { q: 'football transfer', feeds: [G('football/transfer-window')] }),
      ]),
      t('American football', { id: 'american-football', q: 'NFL OR "college football"', feeds: [B('sport/american-football')] }, [
        ...names(['NFL', { feeds: [espn('nfl'), G('sport/nfl')] }]),
        t('College football', { id: 'college', q: '"college football"', feeds: [espn('ncf')] }),
      ]),
      t('Basketball', { q: 'basketball', feeds: [B('sport/basketball')] }, [
        ...names(['NBA', { feeds: [espn('nba'), G('sport/nba')] }], ['WNBA', { feeds: [espn('wnba'), G('sport/wnba')] }], ['EuroLeague', { q: 'EuroLeague basketball' }], ['NCAA', { q: 'NCAA basketball', feeds: [espn('ncb')] }]),
      ]),
      t('Baseball', { q: 'baseball', feeds: [G('sport/baseball')] }, [...names(['MLB', { feeds: [espn('mlb')] }])]),
      t('Ice hockey', { q: '"ice hockey" OR NHL', feeds: [G('sport/ice-hockey')] }, [
        ...names(['NHL', { feeds: [espn('nhl')] }]),
        t('International', { q: 'IIHF OR "ice hockey world championship"' }),
      ]),
      t('Tennis', { q: 'tennis', feeds: [B('sport/tennis'), G('sport/tennis'), espn('tennis')] }, [
        t('Grand Slams', { q: 'Wimbledon OR "Australian Open" OR "French Open" OR "Roland Garros" OR "US Open tennis"' }),
        ...names(['ATP', { q: 'ATP tennis' }], ['WTA', { q: 'WTA tennis' }]),
      ]),
      t('Golf', { q: 'golf', feeds: [B('sport/golf'), G('sport/golf'), espn('golf'), F.golfCom] }, [
        ...names(['PGA', { q: '"PGA Tour"' }], ['LIV', { q: '"LIV Golf"' }]),
        t('Majors', { q: 'Masters OR "Open Championship" OR "PGA Championship" OR "US Open golf"' }),
        ...names(['Ryder Cup', { q: '"Ryder Cup"' }]),
      ]),
      t('Motorsport', { q: 'motorsport', feeds: [B('sport/motorsport'), espn('rpm')] }, [
        ...names(
          ['Formula 1', { id: 'f1', q: '"Formula 1" OR F1', also: ['F1'], feeds: [B('sport/formula1'), F.autosport, motorsport('f1'), G('sport/formulaone'), espn('f1')] }],
          ['MotoGP', { feeds: [motorsport('motogp')] }],
          ['NASCAR', { feeds: [motorsport('nascar-cup')] }],
          ['IndyCar', { feeds: [motorsport('indycar')] }],
          ['WRC', { q: 'WRC rally', feeds: [motorsport('wrc')] }],
          ['Formula E', { q: '"Formula E"', feeds: [motorsport('formula-e')] }],
          ['Le Mans/WEC', { id: 'wec', q: '"Le Mans" OR WEC endurance', feeds: [motorsport('wec')] }],
        ),
      ]),
      t('Rugby', { q: 'rugby', feeds: [G('sport/rugby-union'), F.rugbyWorld] }, [
        t('Union', { q: '"rugby union"', feeds: [B('sport/rugby-union'), G('sport/rugby-union')] }),
        t('League', { q: '"rugby league" OR NRL', feeds: [B('sport/rugby-league')] }),
        ...names(['Six Nations', { q: '"Six Nations"' }], ['Rugby World Cup', { q: '"Rugby World Cup"' }]),
      ]),
      t('Cricket', { q: 'cricket', feeds: [B('sport/cricket'), F.cricinfo] }),
      t('Combat sports', { id: 'combat', q: 'boxing OR MMA OR UFC' }, [
        t('Boxing', { q: 'boxing', feeds: [B('sport/boxing'), espn('boxing'), G('sport/boxing')] }),
        t('MMA/UFC', { id: 'mma', q: 'MMA OR UFC', name: true, feeds: [B('sport/mixed-martial-arts'), espn('mma')] }),
        t('Wrestling/WWE', { id: 'wrestling', q: 'WWE OR wrestling', name: true }),
        t('Judo', { q: 'judo', feeds: [B('sport/judo')] }),
        t('Sumo', { q: 'sumo' }),
      ]),
      t('Cycling', { q: 'cycling', feeds: [B('sport/cycling'), F.cyclingnews, G('sport/cycling')] }, [
        ...names(['Tour de France', { q: '"Tour de France"' }], ['Giro', { q: '"Giro d\'Italia"', also: ["Giro d'Italia"] }], ['Vuelta', { q: '"Vuelta a España" OR Vuelta cycling' }]),
        t('Track cycling', { id: 'track', q: '"track cycling"' }),
      ]),
      t('Athletics / track & field', { id: 'athletics', q: 'athletics OR "track and field"', feeds: [B('sport/athletics'), G('sport/athletics')] }),
      t('Marathons', { q: 'marathon', feeds: [F.runnersWorld] }),
      t('Triathlon', { q: 'triathlon OR Ironman', feeds: [B('sport/triathlon')] }),
      t('Swimming', { q: 'swimming championships OR swimmer', feeds: [B('sport/swimming'), F.swimswam] }),
      t('Diving', { q: 'diving championships OR divers', feeds: [B('sport/diving'), F.swimswam] }),
      t('Water polo', { q: '"water polo"', feeds: [F.swimswam] }),
      t('Olympics & Paralympics', { id: 'olympics', q: 'Olympics OR Paralympics OR Olympic', feeds: [B('sport/olympics'), G('sport/olympic-games'), espn('oly')] }),
      t('Para sports', { id: 'para', q: 'Paralympic OR "para sport" OR para-athlete', feeds: [B('sport/disability-sport')] }),
      t('Winter sports', { id: 'winter', q: '"winter sports"', feeds: [B('sport/winter-sports')] }, [
        t('Skiing', { q: 'skiing OR "World Cup ski"', feeds: [G('sport/skiing'), F.skimag] }),
        t('Snowboarding', { q: 'snowboarding' }),
        t('Biathlon', { q: 'biathlon' }),
        t('Figure skating', { q: '"figure skating"' }),
        t('Speed skating', { q: '"speed skating"' }),
        t('Bobsleigh/luge/skeleton', { id: 'sliding', q: 'bobsleigh OR luge OR skeleton' }),
        t('Curling', { q: 'curling' }),
      ]),
      t('Racket sports', { id: 'racket', q: 'badminton OR "table tennis" OR padel OR squash' }, [
        t('Badminton', { q: 'badminton', feeds: [B('sport/badminton')] }),
        t('Table tennis', { q: '"table tennis"', feeds: [B('sport/table-tennis')] }),
        t('Padel', { q: 'padel' }),
        t('Squash', { q: 'squash championship', feeds: [B('sport/squash'), F.psa] }),
      ]),
      ...group('Other team sports', [
        t('Handball', { q: 'handball' }),
        t('Volleyball', { q: 'volleyball', feeds: [B('sport/volleyball')] }),
        t('Field hockey', { id: 'field-hockey', q: '"field hockey" OR "hockey" FIH', feeds: [B('sport/hockey')] }),
        t('Lacrosse', { q: 'lacrosse' }),
        t('Netball', { q: 'netball', feeds: [B('sport/netball')] }),
        t('Softball', { q: 'softball' }),
        t('Australian rules football', { id: 'afl', q: 'AFL football', also: ['AFL'], feeds: [F.afl] }),
        t('Gaelic football & hurling', { id: 'gaelic', q: '"Gaelic football" OR hurling OR GAA' }),
        t('Canadian football', { id: 'cfl', q: 'CFL football', also: ['CFL'] }),
        t('Floorball', { q: 'floorball', feeds: [F.floorball] }),
        t('Kabaddi', { q: 'kabaddi' }),
      ]),
      t('Precision & mind sports', { id: 'precision', q: 'darts OR snooker OR chess' }, [
        t('Darts', { q: 'darts PDC', feeds: [B('sport/darts'), G('sport/darts')] }),
        t('Snooker & billiards', { id: 'snooker', q: 'snooker OR billiards OR pool', feeds: [B('sport/snooker')] }),
        t('Chess', { q: 'chess', feeds: [F.chessCom, G('sport/chess')] }),
        t('Bowling', { q: 'bowling OR bowls', feeds: [B('sport/bowls')] }),
        t('Archery', { q: 'archery', feeds: [B('sport/archery')] }),
        t('Shooting', { q: 'shooting sport ISSF OR "Olympic shooting"', feeds: [B('sport/shooting')] }),
      ]),
      t('Other sports', { id: 'other', q: 'sport' }, [
        t('Gymnastics', { q: 'gymnastics', feeds: [B('sport/gymnastics')] }),
        t('Fencing', { q: 'fencing championships', feeds: [B('sport/fencing')] }),
        t('Rowing', { q: 'rowing', feeds: [B('sport/rowing')] }),
        t('Canoe & kayak', { id: 'canoe', q: 'canoe OR kayak', feeds: [B('sport/canoeing')] }),
        t('Weightlifting', { q: 'weightlifting', feeds: [B('sport/weightlifting')] }),
        t('Bodybuilding', { q: 'bodybuilding' }),
        t('Equestrian', { q: 'equestrian OR showjumping', feeds: [B('sport/equestrian')] }),
        t('Polo', { q: 'polo match' }),
        t('Rodeo', { q: 'rodeo' }),
        t('Motorboat racing', { id: 'powerboat', q: 'powerboat OR "motorboat racing" OR "E1 series"' }),
        t('Mountaineering & climbing', { id: 'mountaineering', q: 'mountaineering OR Everest OR climbers', feeds: [F.climbingMag] }),
        t('Cheerleading', { q: 'cheerleading' }),
      ]),
      t('Extreme & action sports', { id: 'action', q: 'surfing OR skateboarding OR climbing', feeds: [F.outside] }, [
        t('Surfing', { q: 'surfing', feeds: [B('sport/surfing'), F.surfer] }),
        t('Skateboarding', { q: 'skateboarding', feeds: [B('sport/skateboarding')] }),
        t('Climbing', { q: '"sport climbing" OR bouldering', feeds: [F.climbingMag] }),
      ]),
      t('Horse racing', { id: 'horse-racing', q: '"horse racing"', feeds: [B('sport/horse-racing'), G('sport/horse-racing')] }),
      t('Sailing', { q: 'sailing OR "America\'s Cup"', feeds: [G('sport/sailing'), B('sport/sailing'), F.sailWorld] }),
      t('Esports', { q: 'esports', feeds: [F.esportsInsider] }),
      t('Sports topics', { id: 'topics', q: 'sport' }, [
        t('Doping', { q: 'doping OR WADA' }),
        t('Refereeing & VAR', { id: 'refereeing', q: 'referee OR VAR' }),
        t('Suspensions & discipline', { id: 'discipline', q: 'suspended OR ban sport' }),
        t('Records', { q: '"world record" sport' }),
        t('Coaching & managers', { id: 'coaching', q: 'coach OR manager sacked OR appointed' }),
        t('Club ownership & sports business', { id: 'business', q: '"club takeover" OR "sports business" OR owners', feeds: [F.sportspro] }),
      ]),
      t('Betting & fantasy sports', { id: 'betting', q: 'betting odds OR "fantasy football" OR "sports betting"', feeds: [F.rotowire] }),
      t('Live scores & fixtures', { id: 'scores', q: 'live score OR fixtures OR result' }),
    ],
  },

  // 15 -----------------------------------------------------------------------
  {
    id: 'entertainment',
    title: 'Entertainment',
    emoji: '🎬',
    icon: 'film-outline',
    section: 'ENTERTAINMENT',
    q: 'entertainment',
    feeds: [F.variety, F.thr, F.deadline, B('news/entertainment_and_arts'), G('culture'), F.cbsEntertainment],
    kids: [
      t('Movies', { q: 'film OR movie', feeds: [G('film'), F.variety, F.deadline] }, [
        t('Releases', { q: 'new movie release OR "in cinemas"' }),
        t('Box office', { q: '"box office"' }),
        t('Reviews', { q: 'film review' }),
        t('Trailers', { q: 'trailer film' }),
      ]),
      t('TV & streaming', { id: 'tv', q: 'TV series OR streaming', feeds: [G('tv-and-radio'), F.varietyTv, G('media/television')] }, [
        ...names(['Netflix', { feeds: [G('media/netflix')] }], ['Disney+', { q: '"Disney+" OR "Disney Plus"' }], ['HBO', { q: 'HBO OR "HBO Max"' }], ['Prime Video', { q: '"Prime Video"' }], ['Apple TV+', { q: '"Apple TV+"' }]),
      ]),
      t('Music', { q: 'music', feeds: [G('music'), F.billboard, F.nme, F.pitchfork, F.rollingStone] }, [
        t('New releases', { id: 'releases', q: 'new album OR new single' }),
        t('Concerts & tours', { id: 'tours', q: 'tour dates OR concert' }),
        t('Charts', { q: 'Billboard chart OR "number one" single', feeds: [F.billboard] }),
        t('Festivals', { q: '"music festival" OR Glastonbury OR Coachella' }),
        ...group('Genres', [
          t('Pop', { q: 'pop music OR pop star', feeds: [G('music/popandrock')] }),
          t('Rap/hip-hop', { id: 'hip-hop', q: 'rapper OR "hip-hop"', feeds: [G('music/rap')] }),
          t('Rock', { q: '"rock band" OR rock music', feeds: [G('music/popandrock')] }),
          t('Electronic', { q: '"electronic music" OR DJ', feeds: [G('music/electronicmusic')] }),
          t('K-pop', { q: 'K-pop OR BTS OR Blackpink', name: true }),
          t('Latin', { q: '"Latin music" OR reggaeton' }),
          t('Classical & opera', { id: 'classical', q: '"classical music" OR opera', feeds: [G('music/classicalmusicandopera')] }),
          t('Jazz', { q: 'jazz', feeds: [G('music/jazz')] }),
        ]),
      ]),
      t('Celebrities & gossip', { id: 'celebrities', q: 'celebrity', feeds: [G('lifeandstyle/celebrity')] }),
      t('Awards', { q: 'awards ceremony' }, [
        ...names(['Oscars', { q: 'Oscars OR "Academy Awards"', feeds: [G('film/oscars')] }], ['Grammys', { feeds: [G('music/grammys')] }], 'Emmys', ['Cannes', { q: '"Cannes Film Festival"' }], ['Golden Globes', { q: '"Golden Globes"' }], ['BAFTAs', { q: 'BAFTA OR BAFTAs' }]),
      ]),
      t('Anime & manga', { id: 'anime', q: 'anime OR manga', feeds: [F.cbr] }),
      t('Animation', { q: 'animation OR animated film', feeds: [F.cartoonBrew, G('film/animation')] }),
      t('Comics & superheroes', { id: 'comics', q: 'comics OR Marvel OR DC superhero', feeds: [G('books/comics'), F.cbr] }),
      t('Cartoons', { q: 'cartoon series OR cartoons', feeds: [F.cartoonBrew] }),
      t('Podcasts', { q: 'podcast', feeds: [G('tv-and-radio/podcasts')] }),
      t('Radio', { q: 'radio station OR radio presenter', feeds: [G('media/radio')] }),
      t('Theatre & Broadway', { id: 'theatre', q: 'theatre OR Broadway OR "West End"', feeds: [G('stage/theatre'), G('stage')] }),
      t('Dance & ballet', { id: 'dance', q: 'ballet OR dance company', feeds: [G('stage/dance')] }),
      t('Festivals', { q: '"film festival" OR "arts festival"' }),
      t('Influencers & creators', { id: 'creators', q: 'influencer OR YouTuber OR creators', feeds: [F.dailyDot] }),
    ],
  },

  // 16 -----------------------------------------------------------------------
  {
    id: 'gaming',
    title: 'Gaming',
    emoji: '🎮',
    icon: 'game-controller-outline',
    q: 'video games',
    feeds: [F.ign, F.polygon, F.kotaku, F.eurogamer, F.pcgamer, F.vg247, G('games')],
    kids: [
      t('Console', { q: 'console games', each: '{}' }, [
        ...names(['PlayStation', { q: 'PlayStation OR PS5' }], ['Xbox', {}], ['Nintendo', { q: 'Nintendo OR Switch', feeds: [G('games/nintendo')] }]),
      ]),
      t('PC', { q: '"PC games" OR Steam', feeds: [F.pcgamer] }),
      t('Mobile', { q: '"mobile games"' }),
      t('New releases', { id: 'releases', q: '"video game" release date OR launches' }),
      t('Reviews', { q: 'game review' }),
      t('Industry', { q: '"games industry" OR "video game industry"' }),
      t('Esports', { q: 'esports', feeds: [F.esportsInsider] }),
      t('VR', { q: '"VR game" OR "virtual reality" game', feeds: [F.uploadVr, F.roadToVr] }),
      t('Retro', { q: '"retro games" OR "retro gaming"' }),
      t('Deals', { q: 'game deals OR sale Steam' }),
      t('Board games & tabletop', { id: 'board-games', q: '"board game" OR tabletop OR "Dungeons & Dragons"', feeds: [F.bgg] }),
    ],
  },

  // 17 -----------------------------------------------------------------------
  {
    id: 'culture',
    title: 'Culture & Arts',
    emoji: '🎨',
    icon: 'color-palette-outline',
    q: 'arts culture',
    feeds: [G('artanddesign'), F.artnews, F.artNewspaper, F.hyperallergic, G('culture'), F.openCulture],
    kids: [
      t('Art & exhibitions', { id: 'art', q: 'art exhibition', feeds: [G('artanddesign/exhibition'), F.artnews, F.artNewspaper] }),
      t('Museums', { q: 'museum', feeds: [G('culture/museums')] }),
      t('Libraries', { q: 'library OR libraries', feeds: [G('books/libraries'), F.americanLibraries] }),
      t('Photography', { q: 'photography OR photographer', feeds: [G('artanddesign/photography'), F.petapixel] }),
      t('Architecture', { q: 'architecture OR architect', feeds: [G('artanddesign/architecture'), F.archdaily, F.dezeen] }),
      t('Design', { q: 'design OR designer', feeds: [G('artanddesign/design'), F.dezeen] }),
      t('Books & literature', { id: 'books', q: 'books OR novel OR author', feeds: [G('books'), F.lithub, F.marginalian] }, [
        t('Releases', { q: 'new book OR "new novel"' }),
        t('Bestsellers', { q: 'bestseller book' }),
        t('Authors', { q: 'author OR novelist' }),
      ]),
      t('History', { q: 'history OR historians', feeds: [F.smithsonian, F.mentalFloss] }),
      t('Philosophy', { q: 'philosophy OR philosopher', feeds: [F.aeon, G('world/philosophy')] }),
      t('Languages', { q: 'language learning OR linguistics OR dialect', feeds: [F.wordOfDay] }),
      t('Heritage', { q: 'heritage OR "cultural heritage"' }),
      t('Monuments & heritage sites', { id: 'monuments', q: '"World Heritage" OR monument', feeds: [F.unesco] }),
      t('Customs & traditions', { id: 'traditions', q: 'tradition OR folklore OR customs', feeds: [F.atlasObscura] }),
    ],
  },

  // 18 -----------------------------------------------------------------------
  {
    id: 'religion',
    title: 'Religion',
    emoji: '🙏',
    icon: 'book-outline',
    q: 'religion OR faith',
    feeds: [G('world/religion'), F.catholicNews, F.christianityToday, F.vaticanNews],
    kids: [
      t('Belief systems', { id: 'beliefs', q: 'religion faith' }, [
        t('Christianity', { q: 'Christian OR church', feeds: [G('world/christianity'), F.christianityToday, F.catholicNews] }),
        t('Islam', { q: 'Islam OR Muslim', feeds: [G('world/islam'), F.aboutIslam] }),
        t('Judaism', { q: 'Judaism OR Jewish', feeds: [G('world/judaism')] }),
        t('Hinduism', { q: 'Hinduism OR Hindu', feeds: [G('world/hinduism'), F.hinduismToday] }),
        t('Buddhism', { q: 'Buddhism OR Buddhist', feeds: [G('world/buddhism'), F.lionsRoar] }),
        t('Sikhism', { q: 'Sikh OR Sikhism', feeds: [G('world/sikhism')] }),
        t('Other beliefs', { id: 'other', q: 'Shinto OR Bahai OR Jain OR Taoism OR pagan' }),
        t('Atheism & agnosticism', { id: 'atheism', q: 'atheism OR atheist OR agnostic OR secularism', feeds: [G('world/atheism')] }),
      ]),
      t('Religious leaders', { id: 'leaders', q: 'pope OR imam OR rabbi OR archbishop' }, [
        ...names(['Pope', { feeds: [F.vaticanNews, G('world/pope-francis'), G('world/catholicism')] }], ['Dalai Lama', { q: '"Dalai Lama"' }], ['Archbishop of Canterbury', { q: '"Archbishop of Canterbury"' }]),
      ]),
      t('Religious holidays', { id: 'holidays', q: 'religious holiday' }, [
        ...names('Christmas', ['Ramadan', { feeds: [G('world/ramadan')] }], 'Easter', 'Eid', 'Hanukkah', 'Diwali', 'Passover', 'Vesak'),
      ]),
      t('Religion & government', { id: 'government', q: 'religion state OR "religious freedom"' }),
      t('Religious conflicts', { id: 'conflicts', q: 'sectarian violence OR "religious persecution"' }),
      t('Places of worship', { id: 'worship', q: 'church OR mosque OR synagogue OR temple OR cathedral' }),
    ],
  },

  // 19 -----------------------------------------------------------------------
  {
    id: 'media',
    title: 'Media',
    emoji: '📺',
    icon: 'tv-outline',
    q: 'media industry',
    feeds: [G('media'), F.niemanlab, F.pressGazette],
    kids: [
      t('News media industry', { id: 'industry', q: '"news industry" OR newsroom', feeds: [F.niemanlab, F.pressGazette] }),
      t('Newspapers & magazines', { id: 'print', q: 'newspaper OR magazine', feeds: [G('media/newspapers'), G('media/magazines')] }),
      t('TV & radio', { id: 'broadcast', q: 'broadcaster OR "TV channel" OR radio', feeds: [G('media/television'), G('media/radio')] }),
      t('Social media platforms', { id: 'platforms', q: 'TikTok OR Meta OR YouTube OR X platform', feeds: [F.platformer, F.socialMediaToday] }),
      t('Journalism', { q: 'journalism OR journalists', feeds: [F.niemanlab] }),
      t('Press freedom', { id: 'press-freedom', q: '"press freedom" OR journalist jailed OR killed', feeds: [F.cpj, G('media/press-freedom')] }),
      t('Disinformation & misinformation', { id: 'disinformation', q: 'disinformation OR misinformation OR "fake news"', feeds: [F.fullFact, F.snopes] }),
      t('AI-generated content', { id: 'ai-content', q: '"AI-generated" OR deepfake' }),
    ],
  },

  // 20 -----------------------------------------------------------------------
  {
    id: 'royals',
    title: 'Royals & Human Interest',
    emoji: '👑',
    icon: 'diamond-outline',
    q: 'royal family OR human interest',
    feeds: [G('uk/monarchy')],
    kids: [
      t('Royal families', { id: 'royal-families', q: '"royal family" OR king OR queen OR prince', feeds: [G('uk/monarchy')] }),
      t('High society', { id: 'high-society', q: 'socialite OR "high society" OR gala' }),
      t('Anniversaries', { q: 'anniversary commemoration' }),
      t('Award ceremonies', { id: 'awards', q: '"award ceremony" OR honoured OR knighthood OR "Nobel Prize"' }),
      t('World records & achievements', { id: 'records', q: '"Guinness World Record" OR "world record"' }),
      t('Weddings & births', { id: 'weddings-births', q: 'royal wedding OR "baby born" OR engagement celebrity' }),
      t('Obituaries & deaths of famous people', { id: 'obituaries', q: 'dies aged OR obituary', feeds: [G('tone/obituaries')] }),
    ],
  },

  // 21 -----------------------------------------------------------------------
  {
    id: 'lifestyle',
    title: 'Lifestyle',
    emoji: '✨',
    icon: 'cafe-outline',
    q: 'lifestyle',
    feeds: [G('lifeandstyle'), F.lifehacker],
    kids: [
      t('Fashion', { q: 'fashion', feeds: [G('fashion'), F.vogue, F.wwd] }, [
        t('Trends', { q: 'fashion trends' }),
        t('Fashion weeks', { id: 'weeks', q: '"fashion week"', feeds: [G('fashion/fashion-weeks')] }),
        t('Streetwear', { q: 'streetwear OR sneakers', feeds: [F.highsnobiety] }),
        t('Luxury brands', { id: 'luxury', q: 'Chanel OR Gucci OR "Louis Vuitton" OR Dior', feeds: [F.luxuryDaily] }),
      ]),
      t('Beauty & skincare', { id: 'beauty', q: 'beauty OR skincare', feeds: [G('fashion/beauty'), F.allure] }),
      t('Food & drink', { id: 'food', q: 'food OR recipe', feeds: [G('food'), F.bonappetit, F.eater] }, [
        t('Recipes', { q: 'recipe', feeds: [F.bonappetit] }),
        t('Restaurants', { q: 'restaurant', feeds: [G('food/restaurants'), F.eater] }),
        t('Chefs', { q: 'chef' }),
        t('Wine', { q: 'wine', feeds: [G('food/wine')] }),
        t('Coffee', { q: 'coffee', feeds: [G('food/coffee')] }),
        t('Vegetarian & vegan', { id: 'vegan', q: 'vegan OR vegetarian', feeds: [G('food/vegan'), G('food/vegetarian')] }),
        t('Organic food', { id: 'organic', q: '"organic food" OR organic farming' }),
      ]),
      t('Home & garden', { id: 'home', q: 'home OR garden', feeds: [G('lifeandstyle/homes'), G('lifeandstyle/gardens'), F.apartmentTherapy] }, [
        t('Interior design', { id: 'interiors', q: '"interior design"', feeds: [G('lifeandstyle/interiors'), F.apartmentTherapy] }),
        t('DIY', { q: 'DIY home improvement', feeds: [G('lifeandstyle/diy')] }),
      ]),
      t('Parenting & family', { id: 'parenting', q: 'parenting OR parents', feeds: [G('lifeandstyle/family')] }),
      t('Relationships & dating', { id: 'relationships', q: 'relationships OR dating', feeds: [G('lifeandstyle/relationships'), G('lifeandstyle/dating')] }),
      t('Weddings', { q: 'wedding', feeds: [G('lifeandstyle/weddings')] }),
      t('Pets', { q: 'pets OR dogs OR cats', feeds: [G('lifeandstyle/pets')] }),
      t('Shopping & deals', { id: 'shopping', q: 'deals OR sale shopping', feeds: [F.slickdeals] }),
      t('Self-improvement & productivity', { id: 'self-improvement', q: 'productivity OR habits OR "self-improvement"', feeds: [F.lifehacker] }),
      t('Hobbies & crafts', { id: 'hobbies', q: 'hobby OR crafts OR knitting', feeds: [G('lifeandstyle/craft')] }),
      t('Outdoor activities', { id: 'outdoor', q: 'outdoors OR hiking OR camping', feeds: [F.outside] }, [
        t('Hiking', { q: 'hiking OR trail', feeds: [G('lifeandstyle/walking')] }),
        t('Fishing', { q: 'fishing angling', feeds: [F.fishingWorld] }),
        t('Camping', { q: 'camping' }),
      ]),
      t('Nightlife & parties', { id: 'nightlife', q: 'nightlife OR clubbing OR nightclub' }),
      t('Trends', { q: 'trend OR trending lifestyle' }),
    ],
  },

  // 22 -----------------------------------------------------------------------
  {
    id: 'travel',
    title: 'Travel',
    emoji: '✈️',
    icon: 'airplane-outline',
    q: 'travel',
    feeds: [G('travel'), F.cntraveler, F.skift],
    kids: [
      t('Destinations', { q: 'travel destination' }),
      t('Airlines & airports', { id: 'airlines', q: 'airline OR airport', feeds: [F.simpleFlying, F.airlinegeeks] }),
      t('Hotels', { q: 'hotel', feeds: [G('travel/hotels'), dive('hoteldive')] }),
      t('Travel tips', { id: 'tips', q: '"travel tips"' }),
      t('Deals', { q: '"travel deals" OR cheap flights' }),
      t('Advisories & safety', { id: 'advisories', q: '"travel advisory" OR "travel warning"' }),
      t('Cruises', { q: 'cruise ship OR cruises', feeds: [G('travel/cruises')] }),
      t('Adventure travel', { id: 'adventure', q: '"adventure travel"', feeds: [F.outside] }),
      t('Visas & passports', { id: 'visas', q: 'visa OR passport travel' }),
      t('Holidays & vacations', { id: 'holidays', q: 'holiday OR vacation travel' }),
      t('Theme parks & leisure venues', { id: 'theme-parks', q: '"theme park" OR Disneyland OR "water park"' }),
    ],
  },

  // 23 -----------------------------------------------------------------------
  {
    id: 'auto',
    title: 'Auto & Mobility',
    emoji: '🚗',
    icon: 'car-sport-outline',
    q: 'cars OR automotive',
    feeds: [F.motor1, F.carAndDriver, G('technology/motoring'), F.electrek],
    kids: [
      t('New cars', { id: 'new-cars', q: '"new car" OR unveiled car' }),
      t('Electric vehicles', { id: 'ev', q: '"electric vehicle" OR EV', feeds: [F.electrek, G('environment/electric-cars')] }),
      t('Reviews', { q: 'car review', feeds: [F.carAndDriver] }),
      t('Motorcycles', { q: 'motorcycle OR motorbike' }),
      t('Auto industry', { id: 'industry', q: 'carmaker OR "auto industry"', feeds: [dive('automotivedive'), G('business/automotive-industry')] }),
      t('Recalls', { q: 'recall vehicles' }),
      t('Self-driving cars', { id: 'self-driving', q: '"self-driving" OR autonomous OR robotaxi', feeds: [G('technology/self-driving-cars')] }),
      t('Public transport', { id: 'public-transport', q: '"public transport" OR train OR bus OR metro', feeds: [G('uk/rail-transport'), F.railwayGazette] }),
      t('Bikes & scooters', { id: 'bikes', q: 'e-bike OR "e-scooter" OR cycling', feeds: [G('lifeandstyle/cycling')] }),
      t('Commuting', { q: 'commuters OR commute', feeds: [dive('smartcitiesdive')] }),
    ],
  },

  // 24 -----------------------------------------------------------------------
  {
    id: 'real-estate',
    title: 'Real Estate',
    emoji: '🏠',
    icon: 'home-outline',
    q: 'real estate OR property market',
    feeds: [F.realtor, G('money/property'), G('society/housing')],
    kids: [
      t('Housing market', { id: 'housing-market', q: '"housing market"' }),
      t('Home prices', { id: 'prices', q: '"house prices" OR "home prices"' }),
      t('Rent', { q: 'rent OR renters' }),
      t('Mortgages', { q: 'mortgage rates', feeds: [G('money/mortgages')] }),
      t('Buying & selling tips', { id: 'tips', q: 'homebuyers tips OR selling home' }),
      t('Commercial real estate', { id: 'commercial', q: '"commercial real estate" OR "office space"', feeds: [G('business/commercial-property')] }),
      t('Luxury homes', { id: 'luxury', q: '"luxury home" OR mansion sold' }),
      t('Construction', { q: 'housebuilding OR construction homes', feeds: [dive('constructiondive')] }),
      t('Public/social housing', { id: 'social-housing', q: '"social housing" OR "public housing" OR "affordable housing"' }),
    ],
  },

  // 25 -----------------------------------------------------------------------
  {
    id: 'education',
    title: 'Education',
    emoji: '🎓',
    icon: 'school-outline',
    q: 'education',
    feeds: [B('news/education'), G('education'), F.edsurge],
    kids: [
      t('Early childhood', { id: 'early', q: '"early childhood" OR preschool OR nursery' }),
      t('Schools', { q: 'schools pupils', also: ['K-12'], feeds: [G('education/schools'), dive('k12dive')] }),
      t('Public vs private schools', { id: 'public-private', q: '"private schools" OR "state schools"', feeds: [G('education/private-schools')] }),
      t('Universities & admissions', { id: 'universities', q: 'university OR admissions', feeds: [G('education/universities'), dive('highereddive')] }),
      t('Vocational training & apprenticeships', { id: 'vocational', q: 'apprenticeship OR "vocational training"', feeds: [G('education/apprenticeships'), G('education/further-education')] }),
      t('Adult education', { id: 'adult', q: '"adult education" OR "lifelong learning"' }),
      t('Teachers', { q: 'teachers', feeds: [G('education/teaching')] }),
      t('Student life', { id: 'students', q: 'students', feeds: [G('education/students')] }),
      t('Exams', { q: 'exams OR results students', feeds: [G('education/exams')] }),
      t('Scholarships', { q: 'scholarship' }),
      t('Education policy', { id: 'policy', q: '"education policy" OR "education minister"' }),
      t('Online learning & edtech', { id: 'edtech', q: 'edtech OR "online learning"', feeds: [F.edsurge] }),
      t('Studying abroad', { id: 'abroad', q: '"study abroad" OR "international students"' }),
    ],
  },

  // 26 -----------------------------------------------------------------------
  {
    id: 'careers',
    title: 'Careers & Work',
    emoji: '👔',
    icon: 'id-card-outline',
    q: 'jobs OR workplace',
    feeds: [G('money/work-and-careers'), dive('hrdive'), F.fastco],
    kids: [
      t('Job market', { id: 'job-market', q: '"job market" OR hiring' }),
      t('Remote & hybrid work', { id: 'remote', q: '"remote work" OR "hybrid work" OR "return to office"' }),
      t('Workplace culture', { id: 'culture', q: '"workplace culture"' }),
      t('Salaries & wages', { id: 'pay', q: 'wages OR salaries OR "minimum wage"', feeds: [G('money/pay')] }),
      t('Unions & strikes', { id: 'unions', q: 'union OR strike workers' }),
      t('Career advice', { id: 'advice', q: '"career advice"' }),
      t('HR', { q: 'HR OR "human resources"', feeds: [dive('hrdive')] }),
      t('Future of work', { id: 'future', q: '"future of work"' }),
      t('Gig economy', { id: 'gig', q: '"gig economy" OR "gig workers"' }),
      t('Self-employment', { id: 'self-employment', q: 'self-employed OR freelancers' }),
      t('Pensions & retirement', { id: 'pensions', q: 'pension OR retirement age', feeds: [G('money/pensions')] }),
      t('Unemployment benefits', { id: 'benefits', q: '"unemployment benefits" OR jobless claims' }),
      t('Workplace health & safety', { id: 'safety', q: '"workplace safety" OR "health and safety" workers' }),
      t('Parental leave', { id: 'parental-leave', q: '"parental leave" OR "maternity leave" OR "paternity leave"' }),
      t('Child labour', { id: 'child-labour', q: '"child labour" OR "child labor"' }),
      t('Volunteering', { q: 'volunteers OR volunteering', feeds: [G('society/volunteering')] }),
    ],
  },

  // 27 -----------------------------------------------------------------------
  {
    id: 'crime',
    title: 'Crime & Justice',
    emoji: '⚖️',
    icon: 'hammer-outline',
    q: 'crime OR court',
    feeds: [G('law'), F.courthouse, F.marshall, G('uk/ukcrime'), G('us-news/us-crime')],
    kids: [
      t('Crime', { q: 'crime police', feeds: [G('uk/ukcrime'), G('us-news/us-crime')] }, [
        t('Homicide', { q: 'murder OR homicide' }),
        t('Shootings', { q: 'shooting' }),
        t('Corruption', { q: 'corruption OR bribery' }),
        t('Fraud', { q: 'fraud' }),
        t('Cybercrime', { q: 'cybercrime OR ransomware gang', feeds: [F.theRecord, F.bleeping] }),
        t('Drug crimes', { id: 'drugs', q: '"drug trafficking" OR "drug bust" OR cartel' }),
        t('Kidnapping', { q: 'kidnapped OR kidnapping' }),
        t('Human trafficking', { id: 'trafficking', q: '"human trafficking"' }),
        t('Organized crime', { id: 'organized', q: '"organised crime" OR mafia OR gang', feeds: [G('world/organised-crime')] }),
        t('Corporate crime', { id: 'corporate', q: '"corporate fraud" OR "white-collar crime" OR fined company' }),
        t('Animal abuse', { id: 'animal-abuse', q: '"animal cruelty" OR "animal abuse"' }),
      ]),
      t('Courts & trials', { id: 'courts', q: 'trial OR court OR verdict', feeds: [F.courthouse] }),
      t('Police & law enforcement', { id: 'police', q: 'police', feeds: [G('uk/police')] }),
      t('Prisons', { q: 'prison OR prisoners', feeds: [G('society/prisons-and-probation'), F.marshall] }),
      t('Law', { q: 'law OR lawyers', feeds: [G('law')] }, [
        t('Civil', { q: 'lawsuit OR "civil case"' }),
        t('Criminal', { q: '"criminal case" OR prosecutors' }),
        t('International', { q: '"international law" OR ICC OR ICJ', feeds: [G('law/international-criminal-court')] }),
      ]),
      t('Legal news', { id: 'legal', q: 'legal ruling OR judge rules', feeds: [F.courthouse] }),
      t('True crime', { id: 'true-crime', q: '"true crime" OR "cold case"' }),
    ],
  },

  // 28 -----------------------------------------------------------------------
  {
    id: 'society',
    title: 'Society',
    emoji: '🤝',
    icon: 'people-outline',
    q: 'society',
    feeds: [G('society')],
    kids: [
      t('Rights', { q: 'rights', feeds: [F.hrw, F.amnesty] }, [
        t('Human rights', { id: 'human', q: '"human rights"', feeds: [G('law/human-rights'), F.hrw, F.amnesty] }),
        t('Freedom of speech & censorship', { id: 'free-speech', q: '"freedom of speech" OR censorship OR "free speech"' }),
        t('Privacy rights', { id: 'privacy', q: '"privacy rights" OR surveillance privacy', feeds: [F.eff] }),
        t('Gender equality', { id: 'gender-equality', q: '"gender equality" OR "gender pay gap"', feeds: [G('world/gender')] }),
        t('LGBTQ+', { id: 'lgbtq', q: 'LGBTQ OR LGBT OR transgender OR gay rights', feeds: [F.pinknews, G('world/lgbt-rights')] }),
        t("Women's rights", { id: 'women', q: '"women\'s rights"', feeds: [G('world/gender')] }),
      ]),
      t('Groups & identity', { id: 'identity', q: 'community identity' }, [
        t('Race & ethnicity', { id: 'race', q: 'race OR ethnic minority', feeds: [G('world/race')] }),
        t('Indigenous peoples', { id: 'indigenous', q: 'indigenous', feeds: [G('world/indigenous-peoples')] }),
        t('Disability', { q: 'disability OR disabled', feeds: [F.disabilityScoop, G('society/disability')] }),
        t('Youth', { q: '"young people" OR youth', feeds: [G('society/youngpeople')] }),
        t('Seniors', { q: 'elderly OR "older people"', feeds: [G('society/older-people')] }),
      ]),
      t('Discrimination', { q: 'discrimination' }, [
        t('Racism', { q: 'racism OR racist', feeds: [G('world/race')] }),
        t('Sexism', { q: 'sexism OR misogyny' }),
        t('Ageism', { q: 'ageism OR "age discrimination"' }),
        t('DEI', { q: 'DEI OR "diversity equity inclusion"', name: true }),
      ]),
      t('Immigration', { q: 'immigration OR migrants', feeds: [G('uk/immigration')] }),
      t('Demographics', { q: 'population OR "birth rate" OR census' }),
      t('Protests & social movements', { id: 'protests', q: 'protest OR protesters', feeds: [G('world/protest')] }),
      t('Social problems', { id: 'problems', q: 'social problems' }, [
        t('Poverty', { q: 'poverty', feeds: [G('society/poverty')] }),
        t('Homelessness', { q: 'homeless OR homelessness', feeds: [G('society/homelessness')] }),
        t('Addiction', { q: 'addiction', feeds: [G('society/drugs')] }),
        t('Bullying', { q: 'bullying' }),
        t('Sexual misconduct & #MeToo', { id: 'metoo', q: '"sexual misconduct" OR MeToo OR harassment', feeds: [G('world/metoo-movement')] }),
        t('Modern slavery', { id: 'slavery', q: '"modern slavery" OR "forced labour"', feeds: [G('world/slavery')] }),
      ]),
      t('Family', { q: 'family' }, [
        t('Adoption', { q: 'adoption children', feeds: [G('society/adoption')] }),
        t('Divorce', { q: 'divorce' }),
        t('Pregnancy & childbirth', { id: 'pregnancy', q: 'pregnancy OR childbirth OR maternity' }),
      ]),
      t('Welfare', { q: 'welfare OR benefits' }, [
        t('Charity', { q: 'charity OR charities', feeds: [G('society/charities')] }),
        t('Child care', { id: 'childcare', q: 'childcare OR "child care"', feeds: [G('society/children')] }),
        t('Elderly care', { id: 'elderly-care', q: '"care homes" OR "elderly care" OR "social care"', feeds: [G('society/social-care')] }),
        t('Social services', { id: 'social-services', q: '"social services" OR "social workers"' }),
      ]),
      t('Ethics', { q: 'ethics OR ethical' }),
      t('Death & dying', { id: 'death', q: '"assisted dying" OR euthanasia OR "end of life"' }),
    ],
  },

  // 29 -----------------------------------------------------------------------
  {
    id: 'opinion',
    title: 'Opinion & Analysis',
    emoji: '🧠',
    icon: 'bulb-outline',
    q: 'opinion OR analysis',
    feeds: [G('commentisfree'), F.foreignPolicy],
    kids: [
      t('Editorials', { q: 'editorial "the view"', feeds: [G('tone/editorials')] }),
      t('Op-eds & columns', { id: 'columns', q: 'opinion column OR op-ed', feeds: [G('commentisfree')] }),
      t('Explainers', { q: 'explainer OR "what we know" OR "what is"', feeds: [G('tone/explainers')] }),
      t('Fact-checks', { id: 'fact-checks', q: '"fact check"', feeds: [F.fullFact, F.snopes] }),
      t('Investigations', { q: 'investigation reveals', feeds: [F.propublica, F.icij, F.intercept] }),
      t('Long reads', { id: 'long-reads', q: '"long read"', feeds: [G('news/series/the-long-read'), F.aeon] }),
      t('Interviews', { q: 'interview', feeds: [G('tone/interview')] }),
      t('Reader letters', { id: 'letters', q: 'letters to the editor', feeds: [G('tone/letters')] }),
      t('Political cartoons', { id: 'cartoons', q: '"political cartoon" OR cartoonist', feeds: [G('commentisfree/series/guardian-comment-cartoon')] }),
    ],
  },

  // 30 -----------------------------------------------------------------------
  {
    id: 'trending',
    title: 'Trending & Feel-good',
    emoji: '😄',
    icon: 'happy-outline',
    q: 'viral OR "good news"',
    feeds: [F.goodNewsNetwork, F.positiveNews, F.upiOdd, F.boredPanda],
    kids: [
      t('Viral stories', { id: 'viral', q: 'viral video OR "goes viral"', feeds: [F.boredPanda, F.dailyDot] }),
      t('Weird news', { id: 'weird', q: 'bizarre OR "odd news" OR weird', feeds: [F.upiOdd] }),
      t('Good news', { id: 'good-news', q: '"good news" OR heartwarming', feeds: [F.goodNewsNetwork, F.positiveNews, G('world/series/the-upside')] }),
      t('Memes & internet trends', { id: 'memes', q: 'meme OR TikTok trend', feeds: [F.knowYourMeme, F.dailyDot] }),
      t('Human-interest stories', { id: 'human-interest', q: 'heartwarming OR "human interest"', feeds: [F.atlasObscura] }),
      t('"On this day"', { id: 'on-this-day', q: '"on this day" history', feeds: [F.mentalFloss] }),
    ],
  },

  // 31 -----------------------------------------------------------------------
  {
    id: 'utilities',
    title: 'Utilities & Daily Extras',
    emoji: '🧩',
    icon: 'grid-outline',
    q: 'daily',
    feeds: [G('crosswords')],
    kids: [
      t('Live scores', { id: 'live-scores', q: 'live score result', feeds: [F.espnTop, B('sport')] }),
      t('Market tickers', { id: 'tickers', q: 'stocks today markets', feeds: [F.marketwatch, F.investing] }),
      t('Weather widget', { id: 'weather', q: 'weather forecast today' }),
      t('Lottery results', { id: 'lottery', q: 'lottery results OR EuroMillions OR Powerball' }),
      t('Horoscopes', { q: 'horoscope' }),
      t('Crosswords & daily puzzles', { id: 'puzzles', q: 'crossword OR Wordle OR puzzle', feeds: [G('crosswords')] }),
      t('TV guide', { id: 'tv-guide', q: '"TV tonight" OR "what to watch"' }),
      t('Quizzes', { q: 'quiz', feeds: [G('tone/quizzes')] }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build(d: Def, parent: NewsNode | null, category: string, eachOf: string | undefined): NewsNode {
  const ownId = d.id ?? slug(d.title);
  const id = parent ? `${parent.id}.${ownId}` : ownId;
  const depth = (parent ? parent.depth + 1 : 1) as 1 | 2 | 3;
  const q = d.q ?? (eachOf ? eachOf.replace('{}', defaultQuery(d.title)) : defaultQuery(d.title));
  const node: NewsNode = {
    id,
    title: d.title,
    depth,
    parent: parent?.id ?? null,
    category,
    q,
    name: d.name ?? false,
    feeds: [...new Set(d.feeds ?? [])],
    group: d.group,
    also: d.also ?? [],
    local: d.local ?? false,
    hub: d.hub ?? false,
    children: [],
  };
  node.children = (d.kids ?? []).map((k) => build(k, node, category, d.each));
  return node;
}

export const CATEGORIES: NewsCategory[] = DEFS.map((c) => {
  const node = build(c, null, c.id, undefined);
  return { ...node, emoji: c.emoji, icon: c.icon, section: c.section, native: c.native ?? {} };
});

const BY_ID = new Map<string, NewsNode>();
(function index(nodes: NewsNode[]) {
  for (const n of nodes) {
    BY_ID.set(n.id, n);
    index(n.children);
  }
})(CATEGORIES);

/** Every node, depth-first. */
export const ALL_NODES: NewsNode[] = [...BY_ID.values()];

export function nodeById(id: string): NewsNode | undefined {
  return BY_ID.get(id);
}

export function categoryOf(id: string): NewsCategory | undefined {
  return CATEGORIES.find((c) => c.id === id.split('.')[0]);
}

/** The node and every ancestor, closest first. */
export function lineage(id: string): NewsNode[] {
  const out: NewsNode[] = [];
  let n = BY_ID.get(id);
  while (n) {
    out.push(n);
    n = n.parent ? BY_ID.get(n.parent) : undefined;
  }
  return out;
}

/** The node and everything under it. */
export function descendants(id: string): NewsNode[] {
  const n = BY_ID.get(id);
  if (!n) return [];
  const out: NewsNode[] = [];
  (function walk(x: NewsNode) {
    out.push(x);
    x.children.forEach(walk);
  })(n);
  return out;
}

/** A node's full path for display: "Sports › Football / soccer › Premier League". */
export function pathTitle(id: string): string {
  return lineage(id)
    .reverse()
    .map((n) => n.title)
    .join(' › ');
}

/** Search the tree by title, other names and query words. */
export function searchNodes(text: string, limit = 40): NewsNode[] {
  const q = text.trim().toLowerCase();
  if (!q) return [];
  const scored: [number, NewsNode][] = [];
  for (const n of ALL_NODES) {
    const title = n.title.toLowerCase();
    let score = 0;
    if (title === q) score = 100;
    else if (title.startsWith(q)) score = 60;
    else if (title.includes(q)) score = 40;
    else if (n.also.some((a) => a.toLowerCase().includes(q))) score = 35;
    else if (n.q.toLowerCase().includes(q)) score = 15;
    if (score) scored.push([score - n.depth, n]);
  }
  return scored
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, n]) => n);
}


export function isCategory(n: NewsNode): n is NewsCategory {
  return n.depth === 1 && 'native' in n;
}
