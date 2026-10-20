import { decodeEntities, filterArticles, mergeArticles, parseFeed, parseSearch, timeAgo, type Article } from '../news';

const BBC_FEED = `<rss><channel>
<item><title><![CDATA[Wiegman signs new deal]]></title>
<description><![CDATA[The England manager commits until 2029.]]></description>
<link>https://www.bbc.co.uk/sport/football/articles/abc?at_medium=RSS&amp;at_campaign=rss</link>
<pubDate>Mon, 19 Oct 2026 10:08:01 GMT</pubDate>
<media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/ace/standard/240/x/live/pic.jpg"/></item>
<item><title>Older story</title><link>https://www.bbc.co.uk/news/1</link><pubDate>Sun, 18 Oct 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

const GUARDIAN_FEED = `<rss><channel><item><title>Margaret Hamilton obituary</title>
<link>https://www.theguardian.com/science/2026/oct/18/margaret-hamilton-obituary</link>
<description>&lt;p&gt;Pioneering software engineer&lt;/p&gt;&lt;p&gt;Apollo was a bold project.&lt;/p&gt; &lt;a href="x"&gt;Continue reading...&lt;/a&gt;</description>
<pubDate>Sun, 18 Oct 2026 16:00:00 GMT</pubDate>
<media:content width="140" url="https://i.guim.co.uk/small.jpg"/><media:content width="460" url="https://i.guim.co.uk/big.jpg"/></item></channel></rss>`;

describe('parseFeed', () => {
  it('reads titles, links, dates and the biggest picture', () => {
    const [first, second] = parseFeed(BBC_FEED, 'sport.football');
    expect(first.title).toBe('Wiegman signs new deal');
    expect(first.url).toBe('https://www.bbc.co.uk/sport/football/articles/abc');
    expect(first.image).toBe('https://ichef.bbci.co.uk/ace/standard/800/x/live/pic.jpg');
    expect(first.source).toBe('BBC');
    expect(second.title).toBe('Older story');
    const [g] = parseFeed(GUARDIAN_FEED, 'science.space');
    expect(g.image).toBe('https://i.guim.co.uk/big.jpg');
    expect(g.summary).toBe('Pioneering software engineer');
    expect(g.source).toBe('The Guardian');
  });

  it('merges feeds newest first without repeats', () => {
    const a = parseFeed(BBC_FEED, 'x');
    const merged = mergeArticles([a, a, parseFeed(GUARDIAN_FEED, 'y')]);
    expect(merged.map((m) => m.title)).toEqual(['Wiegman signs new deal', 'Margaret Hamilton obituary', 'Older story']);
  });
});

it('decodes entities and formats ages', () => {
  expect(decodeEntities('Fish &amp; chips &#8217; &#x2014;')).toBe('Fish & chips ’ —');
  expect(timeAgo(0, 30 * 60_000)).toBe('30 min ago');
  expect(timeAgo(0, 5 * 3_600_000)).toBe('5 h ago');
});

describe('mixing and search', () => {
  const story = (source: string, i: number, hoursAgo: number): Article => ({
    id: `${source}${i}`,
    title: `${source} story ${i}`,
    summary: '',
    url: `https://${source}.example/${i}`,
    source,
    published: Date.UTC(2026, 9, 19, 12) - hoursAgo * 3_600_000,
    topic: 't',
  });

  it("doesn't let one busy feed crowd out the others", () => {
    const busy = Array.from({ length: 80 }, (_, i) => story('busy', i, i * 0.1));
    const quiet = Array.from({ length: 10 }, (_, i) => story('quiet', i, 5 + i));
    const top = mergeArticles([busy, quiet]).slice(0, 10);
    expect(top.filter((a) => a.source === 'quiet').length).toBe(5);
  });

  it('reads Atom feeds', () => {
    const xml = `<feed><entry><title>Hello &amp; welcome</title><link rel="alternate" href="https://www.theverge.com/a"/><updated>2026-10-19T10:00:00Z</updated><summary>Short</summary></entry></feed>`;
    const [a] = parseFeed(xml, 'tech.tech');
    expect(a.title).toBe('Hello & welcome');
    expect(a.url).toBe('https://www.theverge.com/a');
    expect(a.source).toBe('The Verge');
    expect(a.published).toBe(Date.UTC(2026, 9, 19, 10));
  });

  it('splits the publisher off Google News titles', () => {
    const xml = `<rss><channel><item><title>Federer opens a school - The Times</title><link>https://news.google.com/rss/articles/x</link><pubDate>Sat, 17 Oct 2026 05:16:21 GMT</pubDate></item></channel></rss>`;
    const url = 'https://news.google.com/rss/search?q=x&hl=fr&gl=FR&ceid=FR:fr';
    expect(parseSearch(xml, 'search', url)[0]).toMatchObject({ title: 'Federer opens a school', source: 'The Times', language: 'fr', paywall: true });
  });

  it('filters stories by every word typed', () => {
    const list = [story('a', 1, 1), { ...story('b', 2, 1), title: 'Swiss Alps sleep study' }];
    expect(filterArticles(list, 'sleep alps').map((a) => a.source)).toEqual(['b']);
  });
});

describe('going back in time', () => {
  const at = (hoursAgo: number, source: string, i: number): Article => ({
    id: `${source}${i}`,
    title: `${source} ${i} ${hoursAgo}`,
    summary: '',
    url: `https://${source}.example/${i}`,
    source,
    published: Date.UTC(2026, 9, 20, 12) - hoursAgo * 3_600_000,
    topic: 't',
  });

  it('puts a week-old story after this morning’s, whichever feed it is in', () => {
    const slow = [at(1, 'slow', 1), at(170, 'slow', 2)];
    const busy = Array.from({ length: 20 }, (_, i) => at(i * 0.5, 'busy', i));
    const merged = mergeArticles([slow, busy]);
    expect(merged.at(-1)!.id).toBe('slow2');
    expect(merged.slice(0, 4).map((a) => a.source)).toContain('slow');
  });
});
