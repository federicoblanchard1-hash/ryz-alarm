import { extractArticle } from '../reader';

describe('extractArticle', () => {
  const para = (n: number) => `<p>This is paragraph number ${n}, long enough to count as part of the story text.</p>`;
  it('keeps the story and drops banners, menus and scripts', () => {
    const html = `<html><head><meta property="og:title" content="Big &amp; news"><meta property="og:image" content="https://img/hero.jpg?w=1200"><meta property="article:author" content="https://site/profile/mick-o-hare"></head><body>
      <div class="cookie-banner"><p>We use cookies. Accept all cookies to continue reading this site please.</p></div>
      <article><nav><p>Home News Sport Weather and lots of other menu links here</p></nav>
      <figure><img src="https://img/hero.jpg?w=600"><figcaption>Same picture</figcaption></figure>
      ${para(1)}<h2>A sub-heading</h2>${para(2)}
      <script>window.paywall()</script>
      <p>Sign up to our newsletter to get the morning briefing.</p>
      <figure><img src="https://img/second.jpg"><figcaption>A second picture</figcaption></figure>
      ${para(3)}</article></body></html>`;
    const r = extractArticle(html)!;
    expect(r.title).toBe('Big & news');
    expect(r.image).toBe('https://img/hero.jpg?w=600');
    expect(r.byline).toBe('Mick O Hare');
    expect(r.blocks).toEqual([
      { type: 'p', text: 'This is paragraph number 1, long enough to count as part of the story text.' },
      { type: 'h', text: 'A sub-heading' },
      { type: 'p', text: 'This is paragraph number 2, long enough to count as part of the story text.' },
      { type: 'img', src: 'https://img/second.jpg', caption: 'A second picture' },
      { type: 'p', text: 'This is paragraph number 3, long enough to count as part of the story text.' },
    ]);
  });

  it('gives up on pages without a story, like a blocked or video page', () => {
    expect(extractArticle('<html><body><p>This content is not available in your region, sorry about that.</p></body></html>')).toBeNull();
  });
});
