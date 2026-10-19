import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Article } from '@/core/news';
import { NEWS_FRESH_MS, cachedNews, fetchNews } from '@/services/news';
import { onPullToRefresh } from './pullToRefresh';

export type NewsStatus = 'loading' | 'ready' | 'error';

/**
 * Stories for the chosen topics: the cached ones straight away, then fresh
 * ones. Kept up to date: re-fetched when the screen comes into focus, when
 * the app returns to the foreground, every few minutes while it's open, and
 * on pull-to-refresh.
 */
export function useNews(topics: string[]) {
  const key = topics.join(',');
  // Stories are kept with the topics they're for, so changing topics never shows the old list.
  const [loaded, setLoaded] = useState<{ key: string; articles: Article[]; at: number }>({ key: '', articles: [], at: 0 });
  const articles = loaded.key === key ? loaded.articles : [];
  const updatedAt = loaded.key === key ? loaded.at : 0;
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
      const run = fetchNews(key.split(','))
        .then((fresh) => {
          fetchedAt.current = Date.now();
          setLoaded({ key, articles: fresh, at: fetchedAt.current });
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
    if (!key) return;
    cachedNews(key.split(',')).then((cached) => {
      if (cancelled) return;
      if (cached) {
        setLoaded({ key, articles: cached.articles, at: cached.at });
        setStatus('ready');
        fetchedAt.current = cached.at;
      }
      load(false);
    });
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

  const refresh = useCallback(() => load(true), [load]);
  return { articles, status, refresh, refreshing, updatedAt };
}
