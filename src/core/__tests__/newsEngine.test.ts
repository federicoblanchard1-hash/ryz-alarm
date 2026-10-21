import { COUNTRIES } from '../countries';
import type { Article } from '../news';
import { feedsForEntity, feedsForMode, feedsForNode, FEED_MODES, followFeeds, resolveLocal } from '../newsFeeds';
import { migrateNewsTopics, upgradeNewsSettings } from '../newsMigration';
import { defaultNewsPrefs, editionForLocale, followState, toggleFollow, toggleMute, type NewsPrefs } from '../newsPrefs';
import { EDITIONS, F, sourceForFeed } from '../sources';
import { applyFilters, clusterArticles, mutedByTags, orderStories, sortStories } from '../stories';
import { formatOf, tagArticle } from '../tagging';
import { ALL_NODES, CATEGORIES, nodeById } from '../taxonomy';

const en = defaultNewsPrefs('en-US');
const prefs = (p: Partial<NewsPrefs>): NewsPrefs => ({ ...en, ...p });

describe('sources', () => {
  it('gives every node at least one feed, in any language setup', () => {
    for (const setup of [en, prefs({ editions: ['fr-CH'] }), prefs({ editions: ['ja-JP', 'de-DE'] }), prefs({ editions: ['en-GB'], showPaywalled: false })]) {
      for (const n of ALL_NODES) expect(feedsForNode(n, setup).length).toBeGreaterThan(0);
    }
  });

  it('knows the publisher, country and language of every feed the taxonomy reads', () => {
    const urls = new Set(ALL_NODES.flatMap((n) => n.feeds));
    CATEGORIES.forEach((c) => Object.values(c.native).flat().forEach((u) => urls.add(u)));
    for (const url of urls) {
      const s = sourceForFeed(url);
      expect([url, s?.name && s.country && s.language ? 'ok' : 'missing']).toEqual([url, 'ok']);
    }
  });

  it('reads real publishers for every category, specialists for many topics', () => {
    for (const c of CATEGORIES) {
      if (c.local) continue;
      expect([c.id, feedsForNode(c, en).filter((u) => !u.includes('news.google.com')).length >= 2]).toEqual([c.id, true]);
    }
    const withPublisher = ALL_NODES.filter((n) => n.feeds.length > 0).length;
    expect(withPublisher / ALL_NODES.length).toBeGreaterThan(0.5);
  });

  it('covers many countries and languages', () => {
    const langs = new Set([...EDITIONS.map((e) => e.language), ...CATEGORIES.flatMap((c) => Object.keys(c.native))]);
    expect(langs.size).toBeGreaterThanOrEqual(15);
    expect(new Set(EDITIONS.map((e) => e.country)).size).toBeGreaterThanOrEqual(20);
    expect(COUNTRIES.length).toBeGreaterThan(190);
  });

  it('reads French publishers and French Google News for a French reader', () => {
    const fr = prefs({ editions: ['fr-CH'] });
    const world = feedsForNode(nodeById('world')!, fr);
    expect(world).toContain(F.lemonde);
    expect(world).not.toContain(F.nytWorld);
    expect(world.some((u) => u.includes('ceid=CH:fr'))).toBe(true);
  });

  it('fills in where you live for local news', () => {
    const p = prefs({ country: 'CH', city: 'Geneva', region: '' });
    expect(resolveLocal('{city} council OR mayor', p)).toBe('Geneva council OR mayor');
    expect(resolveLocal('{region}', p)).toBe('Switzerland');
    expect(feedsForNode(nodeById('local.national')!, p)[0]).toContain('q=Switzerland');
  });

  it('drops blocked and paywalled sources', () => {
    const urls = feedsForNode(nodeById('world')!, prefs({ blockedSources: ['bbc'], showPaywalled: false }));
    expect(urls.some((u) => u.includes('bbci.co.uk'))).toBe(false);
    expect(urls).not.toContain(F.nytWorld);
  });

  it('has feeds for every mode and entity', () => {
    for (const m of FEED_MODES) expect(feedsForMode(m.id, ['sports.football'], en).length).toBeGreaterThan(0);
    expect(feedsForEntity({ kind: 'country', name: 'CH' }, en).some((u) => u.includes('theguardian.com/world/switzerland'))).toBe(true);
    expect(feedsForEntity({ kind: 'ticker', name: 'aapl' }, en)[0]).toContain('AAPL%20stock');
    // One feed per follow comes first.
    expect(followFeeds(['sports.football', 'tech.ai', 'science.space'], en, 3).map((f) => f.follow)).toEqual(['sports.football', 'tech.ai', 'science.space']);
  });
});

describe('follow and mute', () => {
  it('lets the closest choice win, at any level', () => {
    const follows = ['sports'];
    const muted = ['sports.football.transfers'];
    expect(followState('sports.football', follows, muted)).toBe('followed-above');
    expect(followState('sports.football.transfers', follows, muted)).toBe('muted');
    expect(mutedByTags(['sports', 'sports.football', 'sports.football.transfers'], follows, muted)).toBe(true);
    expect(mutedByTags(['sports', 'sports.football', 'sports.football.premier-league'], follows, muted)).toBe(false);
    // Mute a whole category but follow one topic inside it.
    expect(mutedByTags(['sports', 'sports.tennis'], ['sports.tennis'], ['sports'])).toBe(false);
  });

  it('never follows and mutes the same node', () => {
    const a = toggleMute('tech.ai', ['tech.ai'], []);
    expect(a).toEqual({ follows: [], muted: ['tech.ai'] });
    expect(toggleFollow('tech.ai', a.follows, a.muted)).toEqual({ follows: ['tech.ai'], muted: [] });
  });

  it('picks an edition from the phone', () => {
    expect(editionForLocale('fr-CH')).toBe('fr-CH');
    expect(editionForLocale('fr-BE')).toBe('fr-FR');
    expect(editionForLocale('xx')).toBe('en-US');
  });
});

const article = (o: Partial<Article>): Article => ({ id: o.url ?? o.title ?? 'x', title: '', summary: '', url: 'https://example.com/a', source: 'Example', published: Date.UTC(2026, 9, 20, 9), topic: 'top', language: 'en', ...o });

describe('tagging', () => {
  it('tags category, topic, sub-topic, region, language and entities', () => {
    const tags = tagArticle(article({ title: 'Arsenal beat Chelsea in Premier League thriller as Saka scores twice', summary: 'The London derby ended 3-1.' }));
    expect(tags.topics).toEqual(expect.arrayContaining(['sports.football.premier-league', 'sports.football', 'sports']));
    expect(tags.categories).toContain('sports');
    expect(tags.countries).toContain('GB');
    expect(tags.regions).toContain('europe');
    expect(tags.language).toBe('en');
    expect(tags.entities).toEqual(expect.arrayContaining(['Premier League']));
  });

  it('puts one story in several categories', () => {
    const tags = tagArticle(article({ title: 'Bitcoin falls as the Federal Reserve raises interest rates', topic: 'finance.crypto.bitcoin' }));
    expect(tags.categories).toEqual(expect.arrayContaining(['finance', 'economy']));
  });

  it('tells formats apart', () => {
    expect(formatOf(article({ title: 'Ukraine war live: latest updates' }))).toBe('live');
    expect(formatOf(article({ title: 'In pictures: the week' }))).toBe('gallery');
    expect(formatOf(article({ title: 'Episode 12', media: { kind: 'audio' } }))).toBe('audio');
    expect(formatOf(article({ url: 'https://www.youtube.com/watch?v=1' }))).toBe('video');
    expect(formatOf(article({ title: 'The long read: inside the mine' }))).toBe('longread');
    expect(formatOf(article({ title: 'Markets open higher', summary: 'Stocks rose.' }))).toBe('brief');
  });
});

describe('stories', () => {
  const now = Date.UTC(2026, 9, 20, 12);
  const list = [
    article({ url: 'https://bbc.co.uk/1', source: 'BBC', title: 'Earthquake of magnitude 7.1 strikes off Japan coast', published: now - 3_600_000 }),
    article({ url: 'https://cnn.com/1', source: 'CNN', title: 'Japan coast hit by magnitude 7.1 earthquake, tsunami warning issued', published: now - 2_000_000, image: 'https://img' }),
    article({ url: 'https://nhk.jp/1', source: 'NHK', title: 'Magnitude 7.1 earthquake strikes Japan: tsunami warning', published: now - 1_000_000 }),
    article({ url: 'https://espn.com/1', source: 'ESPN', title: 'Lakers sign veteran guard on one-year deal', published: now - 500_000 }),
  ].map((a) => ({ ...a, tags: tagArticle(a) }));

  it('groups the same news from different publishers', () => {
    const stories = clusterArticles(list);
    expect(stories).toHaveLength(2);
    const quake = stories.find((s) => s.articles.length === 3)!;
    expect(quake.sources).toEqual(expect.arrayContaining(['BBC', 'CNN', 'NHK']));
    expect(quake.lead.source).toBe('CNN'); // it has a picture
    expect(quake.hub).toBe(true);
    // The id stays the same when the order changes.
    expect(clusterArticles([...list].reverse()).find((s) => s.articles.length === 3)!.id).toBe(quake.id);
  });

  it('joins two groups that a later headline bridges', () => {
    const at = (title: string, source: string) => article({ url: `https://${source}.com/x`, source, title, published: now });
    const stories = clusterArticles([
      at('Alberta referendum result announced tonight, officials say', 'pbs'),
      at('Carney celebrates victory as Canada stays united', 'cbc'),
      // Close to both: it joins the first group, and the second one joins it.
      at('Alberta referendum result announced: Carney celebrates Canada victory', 'abc'),
    ]);
    expect(stories).toHaveLength(1);
  });

  it('puts the biggest story first in Top stories and keeps Breaking fresh', () => {
    const stories = clusterArticles(list);
    expect(orderStories('top', stories, en, [], now)[0].sources.length).toBe(3);
    expect(orderStories('breaking', stories, en, [], now + 10 * 3_600_000)).toHaveLength(0);
    expect(orderStories('digest', stories, en, [], now).length).toBeGreaterThan(0);
  });

  it('sorts newest first, by coverage, or keeps the recommended order', () => {
    const stories = clusterArticles(list);
    expect(sortStories(stories, 'newest')[0].lead.source).toBe('ESPN');
    expect(sortStories(stories, 'covered')[0].sources).toHaveLength(3);
    expect(sortStories(stories, 'recommended')).toBe(stories);
  });

  it('applies language, source, keyword and topic filters', () => {
    expect(applyFilters(list, { prefs: prefs({ mutedKeywords: ['tsunami'] }), follows: [] })).toHaveLength(2);
    expect(applyFilters(list, { prefs: prefs({ blockedSources: ['ESPN'] }), follows: [] })).toHaveLength(3);
    expect(applyFilters(list, { prefs: prefs({ editions: ['fr-FR'] }), follows: [] })).toHaveLength(0);
    expect(applyFilters(list, { prefs: prefs({ muted: ['disasters'] }), follows: [] }).map((a) => a.source)).toEqual(['ESPN']);
    expect(applyFilters(list, { prefs: prefs({ regions: ['europe'] }), follows: [] }).map((a) => a.source)).toEqual(['ESPN']);
  });
});

describe('moving old picks over', () => {
  it('maps old topic ids to the new taxonomy and entities', () => {
    const { follows, entities } = migrateNewsTopics(['football.premier_league', 'countries.switzerland', 'tech.ai', 'football.swiss_super_league', 'gone.topic', 'finance.crypto']);
    expect(follows).toEqual(['sports.football.premier-league', 'tech.ai', 'finance.crypto']);
    expect(entities).toEqual([
      { kind: 'country', name: 'CH' },
      { kind: 'league', name: 'Swiss Super League' },
    ]);
  });

  it('fills in news preferences saved before they existed', () => {
    const s = upgradeNewsSettings({ newsTopics: ['world.top'] }, 'de-CH');
    expect(s.newsTopics).toEqual(['world']);
    expect(s.news.editions).toEqual(['de-CH']);
    expect(s.news.showPaywalled).toBe(true);
  });
});
