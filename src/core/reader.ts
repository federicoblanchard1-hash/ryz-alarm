// Reader view: an article's text and pictures pulled out of its page, so it
// reads inside Ryz without the site's pop-ups, cookie banners or sign-up
// walls. The page is fetched on your phone, for you, like Safari Reader.

import { attr, decodeEntities, htmlToText, tag } from './news';

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
