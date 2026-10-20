// What you follow, mute and filter in the news.
//
// You can follow or mute any node of the taxonomy (a category, a topic or a
// sub-topic). The closest choice wins: follow Sports but mute
// Sports › Football › Transfers, and transfer stories stay out. You can also
// follow entities (teams, players, leagues, companies, tickers, people,
// countries, cities, or any keyword), and filter by language, region and
// source.

import { countryByCode, type RegionId } from './countries';
import { DEFAULT_EDITION, EDITIONS } from './sources';
import { lineage, nodeById } from './taxonomy';

export type EntityKind = 'team' | 'player' | 'league' | 'company' | 'ticker' | 'person' | 'country' | 'city' | 'keyword';

export const ENTITY_KINDS: { id: EntityKind; title: string; placeholder: string }[] = [
  { id: 'team', title: 'Team', placeholder: 'Real Madrid, Boston Celtics…' },
  { id: 'player', title: 'Player', placeholder: 'Kylian Mbappé, Coco Gauff…' },
  { id: 'league', title: 'League', placeholder: 'Super League, Ligue 2…' },
  { id: 'company', title: 'Company', placeholder: 'Nestlé, Airbus, Spotify…' },
  { id: 'ticker', title: 'Ticker', placeholder: 'AAPL, NESN, TSLA…' },
  { id: 'person', title: 'Person', placeholder: 'Anyone in the news' },
  { id: 'country', title: 'Country', placeholder: 'Pick from the list' },
  { id: 'city', title: 'City', placeholder: 'Geneva, Lagos, Osaka…' },
  { id: 'keyword', title: 'Keyword', placeholder: 'Any word or phrase' },
];

export interface FollowedEntity {
  kind: EntityKind;
  name: string;
}

export interface NewsPrefs {
  /** Muted taxonomy nodes. (Followed ones are `settings.newsTopics`.) */
  muted: string[];
  entities: FollowedEntity[];
  /** Stories with these words are hidden. */
  mutedKeywords: string[];
  /** Google News editions to read, which also set the languages: the first is the main one. */
  editions: string[];
  /** Your country (ISO code) for Local & National. */
  country: string | null;
  /** Your state, province or region, typed. */
  region: string;
  city: string;
  /** Only stories from these world regions; empty means everywhere. */
  regions: RegionId[];
  /** Source ids (from the registry) or publisher names. */
  preferredSources: string[];
  blockedSources: string[];
  showPaywalled: boolean;
}

/** The edition closest to the phone's language and region. */
export function editionForLocale(locale: string | undefined): string {
  if (!locale) return DEFAULT_EDITION;
  const [lang, region] = locale.replace('_', '-').split('-');
  const l = lang?.toLowerCase();
  const r = region?.toUpperCase();
  return (EDITIONS.find((e) => e.language === l && e.country === r) ?? EDITIONS.find((e) => e.language === l) ?? EDITIONS[0]).id;
}

export function defaultNewsPrefs(locale?: string): NewsPrefs {
  const edition = editionForLocale(locale);
  const country = EDITIONS.find((e) => e.id === edition)?.country ?? null;
  return {
    muted: [],
    entities: [],
    mutedKeywords: [],
    editions: [edition],
    country,
    region: '',
    city: '',
    regions: [],
    preferredSources: [],
    blockedSources: [],
    showPaywalled: true,
  };
}

/** Saved preferences with anything missing filled in (older versions of the app saved fewer). */
export function withNewsDefaults(saved: Partial<NewsPrefs> | undefined, locale?: string): NewsPrefs {
  const base = defaultNewsPrefs(locale);
  const merged = { ...base, ...saved };
  const editions = (merged.editions ?? []).filter((id) => EDITIONS.some((e) => e.id === id));
  return { ...merged, editions: editions.length ? editions : base.editions };
}

/** The languages your editions are in. */
export function languagesOf(prefs: NewsPrefs): string[] {
  return [...new Set(prefs.editions.map((id) => EDITIONS.find((e) => e.id === id)?.language ?? 'en'))];
}

export type FollowState = 'followed' | 'muted' | 'followed-above' | 'muted-above' | null;

/** A node's state: its own choice, or the closest choice above it. */
export function followState(id: string, follows: string[], muted: string[]): FollowState {
  const chain = lineage(id);
  for (let i = 0; i < chain.length; i++) {
    const n = chain[i].id;
    if (muted.includes(n)) return i === 0 ? 'muted' : 'muted-above';
    if (follows.includes(n)) return i === 0 ? 'followed' : 'followed-above';
  }
  return null;
}

export function isMutedNode(id: string, follows: string[], muted: string[]): boolean {
  const s = followState(id, follows, muted);
  return s === 'muted' || s === 'muted-above';
}

/** Follow (or stop following) a node: it can't be followed and muted at once. */
export function toggleFollow(id: string, follows: string[], muted: string[]): { follows: string[]; muted: string[] } {
  if (follows.includes(id)) return { follows: follows.filter((x) => x !== id), muted };
  return { follows: [...follows, id], muted: muted.filter((x) => x !== id) };
}

export function toggleMute(id: string, follows: string[], muted: string[]): { follows: string[]; muted: string[] } {
  if (muted.includes(id)) return { follows, muted: muted.filter((x) => x !== id) };
  return { follows: follows.filter((x) => x !== id), muted: [...muted, id] };
}

export const entityKey = (e: FollowedEntity) => `entity:${e.kind}:${e.name.trim().toLowerCase()}`;

/** The Google News search for an entity. */
export function entityQuery(e: FollowedEntity): string {
  const name = e.name.trim();
  if (e.kind === 'ticker') return `${name.toUpperCase().replace(/^\$/, '')} stock`;
  if (e.kind === 'country') return countryByCode(name)?.name ?? name;
  return name.includes(' ') ? `"${name}"` : name;
}

export function entityTitle(e: FollowedEntity): string {
  if (e.kind === 'country') return countryByCode(e.name)?.name ?? e.name;
  if (e.kind === 'ticker') return `$${e.name.toUpperCase().replace(/^\$/, '')}`;
  return e.name;
}

/** Keep only follows and mutes that exist (the taxonomy can change between versions). */
export function knownIds(ids: string[]): string[] {
  return [...new Set(ids)].filter((id) => nodeById(id));
}
