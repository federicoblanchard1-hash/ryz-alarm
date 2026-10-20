import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Article } from '@/core/news';
import { NEWS_FRESH_MS, cachedNews, fetchNews, fetchOlder } from '@/services/news';
import { onPullToRefresh } from './pullToRefresh';

export type NewsStatus = 'loading' | 'ready' | 'error';
export type OlderStatus = 'idle' | 'loading' | 'done' | 'error';

/** Days of older news fetched per page, and how many empty pages before giving up. */
const OLDER_DAYS = 3;
const MAX_EMPTY_PAGES = 3;
const DAY = 24 * 60 * 60_000;

/**
 * Stories for the chosen topics: the cached ones straight away, then fresh
 * ones as each feed arrives. Kept up to date: re-fetched when the screen
 * comes into focus, when the app returns to the foreground, every few
 * minutes while it's open, and on pull-to-refresh. `loadOlder` goes back in
 * time a few days per call, for endless scrolling.
 */
export function useNews(topics: string[]) {
  const key = topics.join(',');
  // Stories are kept with the topics they're for, so changing topics never shows the old list.
  const [loaded, setLoaded] = useState<{ key: string; articles: Article[]; at: number }>({ key: '', articles: [], at: 0 });
  const [older, setOlder] = useState<{ key: string; articles: Article[]; status: OlderStatus; before: number }>({ key: '', articles: [], status: 'idle', before: 0 });
  const fresh = loaded.key === key ? loaded.articles : [];
  const updatedAt = loaded.key === key ? loaded.at : 0;
  const olderHere = older.key === key ? older : { articles: [] as Article[], status: 'idle' as OlderStatus, before: 0 };
  const [status, setStatus] = useState<NewsStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const fetchedAt = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);

  const load = useCallback(
    (force: boolean): Promise<void> => {
      if (!key) return Promise.resolve();
      if (!force && Date.now() - fetchedAt.current < NEWS_FRESH_MS) return Promise.resolve();
      if (inFlight.current) return inFlight.current;
      setRefreshing(true);
      const run = fetchNews(key.split(','), (partial) => {
        // Show the first stories as soon as they arrive, but don't reshuffle a list already on screen.
        setLoaded((prev) => (prev.key === key && prev.articles.length > 0 ? prev : { key, articles: partial, at: Date.now() }));
        setStatus('ready');
      })
        .then((all) => {
          fetchedAt.current = Date.now();
          setLoaded({ key, articles: all, at: fetchedAt.current });
          setStatus('ready');
        })
        .catch(() => setStatus((s) => (s === 'ready' ? s : 'error')))
        .finally(() => {
          inFlight.current = null;
          setRefreshing(false);
        });
      inFlight.current = run;
      return run;
    },
    [key],
  );

  useEffect(() => {
    let cancelled = false;
    fetchedAt.current = 0;
    inFlight.current = null;
    if (!key) return;
    cachedNews(key.split(','))
      .then((cached) => {
        if (cancelled) return;
        if (cached) {
          setLoaded((prev) => (prev.key === key && prev.articles.length > 0 ? prev : { key, articles: cached.articles, at: cached.at }));
          setStatus('ready');
          fetchedAt.current = cached.at;
        }
      })
      .finally(() => !cancelled && load(false));
    const sub = AppState.addEventListener('change', (state) => state === 'active' && load(false));
    const timer = setInterval(() => AppState.currentState === 'active' && load(false), NEWS_FRESH_MS);
    const unsubscribe = onPullToRefresh(() => load(true));
    return () => {
      cancelled = true;
      sub.remove();
      clearInterval(timer);
      unsubscribe();
    };
  }, [key, load]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const loadingOlder = useRef(false);
  // The lists as they are now, read when loading older stories without re-creating the callback each render.
  const latest = useRef({ fresh, olderHere });
  useLayoutEffect(() => {
    latest.current = { fresh, olderHere };
  });
  const loadOlder = useCallback(() => {
    const { fresh, olderHere } = latest.current;
    if (!key || loadingOlder.current || olderHere.status === 'done') return;
    const have = [...fresh, ...olderHere.articles];
    const seen = new Set(have.flatMap((a) => [a.url, a.title.toLowerCase()]));
    const times = have.map((a) => a.published).filter((t) => t > 0);
    // Start from the oldest story we have (or now), and step back a few days each time.
    const start = olderHere.before || (times.length ? Math.min(...times) : Date.now());
    loadingOlder.current = true;
    setOlder((o) => ({ key, articles: o.key === key ? o.articles : [], before: o.key === key ? o.before : 0, status: 'loading' }));
    (async () => {
      let before = start;
      // A quiet few days can come back empty; keep going back a little before giving up.
      for (let i = 0; i < MAX_EMPTY_PAGES; i++) {
        const page = await fetchOlder(key.split(','), before, OLDER_DAYS);
        before -= OLDER_DAYS * DAY;
        const added = page.filter((a) => !seen.has(a.url) && !seen.has(a.title.toLowerCase()));
        if (added.length > 0) return { added, before, done: false };
      }
      return { added: [] as Article[], before, done: true };
    })()
      .then(({ added, before, done }) =>
        setOlder((o) => ({ key, articles: [...(o.key === key ? o.articles : []), ...added], before, status: done ? 'done' : 'idle' })),
      )
      .catch(() => setOlder((o) => ({ ...o, key, status: 'error' })))
      .finally(() => {
        loadingOlder.current = false;
      });
  }, [key]);

  const refresh = useCallback(() => load(true), [load]);
  const articles = olderHere.articles.length ? [...fresh, ...olderHere.articles] : fresh;
  return { articles, status, refresh, refreshing, updatedAt, loadOlder, olderStatus: olderHere.status };
}
