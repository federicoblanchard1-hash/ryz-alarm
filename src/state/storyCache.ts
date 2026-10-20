import type { Story } from '@/core/stories';

// The stories last shown, so a story's page opens with everything already
// known about it (every source) before it searches for more.

const STORIES = new Map<string, Story>();

export function rememberStories(list: Story[]) {
  for (const s of list) STORIES.set(s.id, s);
  // Keep memory small: the last few hundred stories are plenty.
  if (STORIES.size > 600) [...STORIES.keys()].slice(0, STORIES.size - 600).forEach((k) => STORIES.delete(k));
}

export function storyById(id: string): Story | undefined {
  return STORIES.get(id);
}

/** The story an article belongs to, if it was shown. */
export function storyOfArticle(url: string): Story | undefined {
  for (const s of STORIES.values()) if (s.articles.some((a) => a.url === url)) return s;
  return undefined;
}
