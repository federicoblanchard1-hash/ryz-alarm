/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

import { ALL_NODES, CATEGORIES, type NewsNode } from '../taxonomy';

// Ticks every category, topic and sub-topic in docs/news-brief.md off against
// the taxonomy, one by one.

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['‘’"“”]/g, '')
    .replace(/…|\betc\./g, '')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();

/** Split on commas and semicolons that aren't inside parentheses. */
function splitTop(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if ((ch === ',' || ch === ';') && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter((x) => norm(x));
}

interface Term {
  text: string;
  /** A topic line of the brief: must be a topic (or a group heading) right under the category. */
  topic: boolean;
}

/** Every term one bullet line names: its label, each item, and items in parentheses. */
function termsOf(line: string, nested: boolean): Term[] {
  const colon = (() => {
    let depth = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '(') depth++;
      if (line[i] === ')') depth--;
      if (line[i] === ':' && depth === 0) return i;
    }
    return -1;
  })();
  const out: Term[] = [];
  const label = colon >= 0 ? line.slice(0, colon) : null;
  const rest = colon >= 0 ? line.slice(colon + 1) : line;
  if (label) out.push({ text: label, topic: !nested });
  for (const item of splitTop(rest)) {
    const m = item.match(/^(.*?)\s*\((.*)\)\s*$/);
    const head = m ? m[1] : item;
    out.push({ text: head, topic: !nested && !label });
    if (m) for (const child of splitTop(m[2])) out.push({ text: child, topic: false });
  }
  return out;
}

interface BriefCategory {
  number: number;
  title: string;
  terms: Term[];
}

function parseBrief(): BriefCategory[] {
  const md = readFileSync(join(__dirname, '../../../docs/news-brief.md'), 'utf8');
  const cats: BriefCategory[] = [];
  for (const raw of md.split('\n')) {
    const heading = raw.match(/^(\d+)\.\s+\S+\s+(.+)$/);
    if (heading) {
      cats.push({ number: Number(heading[1]), title: heading[2].trim(), terms: [] });
      continue;
    }
    const bullet = raw.match(/^(\s*)\*\s+(.+)$/);
    if (bullet && cats.length) cats[cats.length - 1].terms.push(...termsOf(bullet[2], bullet[1].length > 0));
  }
  return cats;
}

function namesIn(nodes: NewsNode[]): Set<string> {
  const set = new Set<string>();
  for (const n of nodes) {
    set.add(norm(n.title));
    n.also.forEach((a) => set.add(norm(a)));
    if (n.group) set.add(norm(n.group));
  }
  return set;
}

function flatten(n: NewsNode): NewsNode[] {
  return [n, ...n.children.flatMap(flatten)];
}

const brief = parseBrief();

describe('news taxonomy vs docs/news-brief.md', () => {
  it('has all 31 categories, in order', () => {
    expect(brief).toHaveLength(31);
    expect(CATEGORIES).toHaveLength(31);
    brief.forEach((b, i) => expect(norm(CATEGORIES[i].title)).toBe(norm(b.title)));
  });

  describe.each(brief.map((b, i) => [`${b.number}. ${b.title}`, b, i] as const))('%s', (_label, b, i) => {
    const cat = CATEGORIES[i];
    const all = flatten(cat);
    const names = namesIn(all);
    const topicNames = namesIn(cat.children);

    it.each(b.terms.map((term) => [term.text, term] as const))('has “%s”', (_text, term) => {
      expect(names.has(norm(term.text))).toBe(true);
      if (term.topic) expect(topicNames.has(norm(term.text))).toBe(true);
    });
  });

  it('counts', () => {
    const terms = brief.reduce((n, b) => n + b.terms.length, 0);
    const byDepth = [1, 2, 3].map((d) => ALL_NODES.filter((n) => n.depth === d).length);
    // Printed so the totals can be compared with the brief by eye.
    console.log(`Brief: ${brief.length} categories, ${terms} items. Taxonomy: ${byDepth[0]} categories, ${byDepth[1]} topics, ${byDepth[2]} sub-topics (${ALL_NODES.length} nodes).`);
    expect(byDepth[0]).toBe(31);
    expect(byDepth[1] + byDepth[2]).toBeGreaterThanOrEqual(terms - brief.length * 2);
  });
});

describe('news taxonomy structure', () => {
  it('has unique, well-formed ids at most three levels deep', () => {
    const ids = ALL_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of ALL_NODES) {
      expect(n.id).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+){0,2}$/);
      expect(n.id.split('.')).toHaveLength(n.depth);
    }
  });

  it('uses the brief’s example ids', () => {
    for (const id of ['sports.football.premier-league', 'finance.crypto.bitcoin', 'disasters.accidents.plane-crashes']) {
      expect(ALL_NODES.some((n) => n.id === id)).toBe(true);
    }
  });

  it('gives every node a search', () => {
    for (const n of ALL_NODES) expect(n.q.trim().length).toBeGreaterThan(0);
  });
});
