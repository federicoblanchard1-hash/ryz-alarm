import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Article } from '@/core/news';
import { NEWS_FRESH_MS, cachedNews, fetchNews } from '@/services/news';

export type NewsStatus = 'loading' | 'ready' | 'error';

/** Stories for the chosen topics: the cached ones straight away, then fresh ones. */
export function useNews(topics: string[]) {
  const key = topics.join(',');
  // Stories are kept with the topics they're for, so changing topics never shows the old list.
  const [loaded, setLoaded] = useState<{ key: string; articles: Article[] }>({ key: '', articles: [] });
  const articles = loaded.key === key ? loaded.articles : [];
  const [status, setStatus] = useState<NewsStatus>('loading');
  const fetchedAt = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      if (!key) return;
      if (!force && Date.now() - fetchedAt.current < NEWS_FRESH_MS) return;
      setStatus((s) => (s === 'ready' ? s : 'loading'));
      try {
        const fresh = await fetchNews(key.split(','));
        fetchedAt.current = Date.now();
        setLoaded({ key, articles: fresh });
        setStatus('ready');
      } catch {
        setStatus((s) => (s === 'ready' ? s : 'error'));
      }
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
        setLoaded({ key, articles: cached.articles });
        setStatus('ready');
        fetchedAt.current = cached.at;
      }
      load(false);
    });
    const sub = AppState.addEventListener('change', (state) => state === 'active' && load(false));
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [key, load]);

  const refresh = useCallback(() => load(true), [load]);
  return { articles, status, refresh };
}
