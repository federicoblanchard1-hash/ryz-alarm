import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

import { mergeArticles, parseFeed, parseSearch, type Article } from '@/core/news';
import { olderUrl, type FeedRef } from '@/core/newsFeeds';
import type { FollowedEntity } from '@/core/newsPrefs';
import { gnews } from '@/core/sources';
import { tagAll } from '@/core/tagging';
import { colors } from '@/theme';

const CACHE_KEY = 'ryz/news/v3';
/** Older than this, the feed is fetched again when Morning opens. */
export const NEWS_FRESH_MS = 5 * 60_000;
/** One feed gets this long; a slow one is skipped, never waited for. */
const FEED_MS = 8_000;
/** The whole refresh ends by then with whatever arrived. */
const ALL_FEEDS_MS = 10_000;
/** How many stories to keep for the next launch. */
const CACHE_SIZE = 150;
// Some sites send a lighter page, without app banners, to a phone browser.
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** Rejects after `ms` whatever `promise` does: an aborted download doesn't always stop reading the body. */
function deadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([promise, new Promise<T>((_, reject) => (timer = setTimeout(() => reject(new Error('Timed out')), ms)))]).finally(() => clearTimeout(timer));
}

async function get(url: string, timeoutMs = 10_000, fresh = false): Promise<string> {
  const controller = new AbortController();
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml,application/rss+xml' };
  // Feeds must never come from the phone's HTTP cache, or "fresh" news could be hours old.
  if (fresh) headers['Cache-Control'] = 'no-cache';
  const run = async () => {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };
  try {
    return await deadline(run(), timeoutMs);
  } catch (e) {
    controller.abort();
    throw e;
  }
}

interface Cached {
  key: string;
  at: number;
  articles: Article[];
}

/** The last stories for this feed key (mode + follows + preferences), for an instant start. */
export async function cachedNews(key: string): Promise<Cached | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}/${key.length > 120 ? hashKey(key) : key}`);
    const cached = raw ? (JSON.parse(raw) as Cached) : null;
    return cached && cached.key === key ? cached : null;
  } catch {
    return null;
  }
}

function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function parse(xml: string, f: FeedRef): Article[] {
  return f.url.includes('news.google.com') ? parseSearch(xml, f.follow, f.url) : parseFeed(xml, f.follow, f.url);
}

/**
 * The latest stories from these feeds, tagged. Feeds load in parallel;
 * `onProgress` gets the stories so far as they arrive, so the first ones
 * show in a second or two, and the whole thing ends after ten seconds even if
 * a site hangs. Throws only if no feed answered.
 */
export async function fetchNews(key: string, feeds: FeedRef[], entities: FollowedEntity[], onProgress?: (articles: Article[]) => void): Promise<Article[]> {
  const lists: Article[][] = [];
  await new Promise<void>((resolve) => {
    let pending = feeds.length;
    if (pending === 0) resolve();
    const timer = setTimeout(resolve, ALL_FEEDS_MS);
    let lastSent = 0;
    for (const f of feeds) {
      get(f.url, FEED_MS, true)
        .then((xml) => {
          const items = parse(xml, f);
          if (items.length === 0) return;
          lists.push(items);
          if (onProgress && Date.now() - lastSent > 300) {
            lastSent = Date.now();
            onProgress(tagAll(mergeArticles(lists), entities));
          }
        })
        .catch(() => {})
        .finally(() => {
          pending -= 1;
          if (pending === 0) {
            clearTimeout(timer);
            resolve();
          }
        });
    }
  });
  if (feeds.length > 0 && lists.length === 0) throw new Error('No news feed answered');
  const articles = tagAll(mergeArticles(lists), entities);
  AsyncStorage.setItem(`${CACHE_KEY}/${key.length > 120 ? hashKey(key) : key}`, JSON.stringify({ key, at: Date.now(), articles: articles.slice(0, CACHE_SIZE) } satisfies Cached)).catch(() => {});
  return articles;
}

/**
 * Older stories from before `before` (ms): a few days at a time from Google
 * News, one search per follow (up to six), mixed evenly.
 */
export async function fetchOlder(searches: { follow: string; query: string }[], edition: string, before: number, entities: FollowedEntity[], days = 3): Promise<Article[]> {
  const picked = searches.slice(0, 6);
  const results = await Promise.allSettled(
    picked.map(({ follow, query }) => {
      const url = olderUrl(query, before, days, edition);
      return get(url, FEED_MS, true).then((xml) => parseSearch(xml, follow, url));
    }),
  );
  const lists = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value.filter((a) => a.published < before).slice(0, 12)] : []));
  if (lists.length === 0) throw new Error('No older news');
  return tagAll(mergeArticles(lists), entities);
}

/** Stories about anything, from every publisher Google News knows, in an edition. */
export async function searchNews(query: string, edition?: string): Promise<Article[]> {
  const url = gnews(query, edition);
  return tagAll(parseSearch(await get(url, 10_000, true), 'search', url).slice(0, 30));
}

/** The original page in an in-app browser: Safari's Reader on iPhone, Custom Tabs on Android. */
export function openInAppBrowser(url: string) {
  return WebBrowser.openBrowserAsync(url, {
    readerMode: true,
    controlsColor: colors.text,
    toolbarColor: colors.bg,
    dismissButtonStyle: 'close',
    enableBarCollapsing: true,
  }).catch(() => {});
}
