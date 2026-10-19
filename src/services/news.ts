import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

import { extractArticle, feedsFor, mergeArticles, parseFeed, type Article, type ReadableArticle } from '@/core/news';
import { colors } from '@/theme';

const CACHE_KEY = 'ryz/news/v1';
/** Older than this, the feed is fetched again when Morning opens. */
export const NEWS_FRESH_MS = 20 * 60_000;
// Some sites send a lighter page, without app banners, to a phone browser.
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function get(url: string, timeoutMs = 10_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml,application/rss+xml' }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

interface Cached {
  key: string;
  at: number;
  articles: Article[];
}

export async function cachedNews(topics: string[]): Promise<Cached | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const cached = raw ? (JSON.parse(raw) as Cached) : null;
    return cached && cached.key === topics.join(',') ? cached : null;
  } catch {
    return null;
  }
}

/** The latest stories for these topics, from every feed that answers. Throws only if none does. */
export async function fetchNews(topics: string[]): Promise<Article[]> {
  const feeds = feedsFor(topics);
  const results = await Promise.allSettled(feeds.map((f) => get(f.url).then((xml) => parseFeed(xml, f.topic))));
  const lists = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  if (feeds.length > 0 && lists.length === 0) throw new Error('No news feed answered');
  const articles = mergeArticles(lists);
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ key: topics.join(','), at: Date.now(), articles } satisfies Cached)).catch(() => {});
  return articles;
}

/** The story's text, for the reader view; null if the page can't be read (blocked, video, or no text). */
export async function fetchReadable(url: string): Promise<ReadableArticle | null> {
  try {
    return extractArticle(await get(url, 15_000));
  } catch {
    return null;
  }
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
