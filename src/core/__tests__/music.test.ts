import { parseMusicLink } from '../music';

describe('music links', () => {
  it('reads links shared from music apps', () => {
    expect(parseMusicLink('https://open.spotify.com/playlist/37i9dQZF1DX0UrRvztWcAU?si=abc')).toEqual({ service: 'spotify', url: 'https://open.spotify.com/playlist/37i9dQZF1DX0UrRvztWcAU?si=abc' });
    expect(parseMusicLink('Listen: https://music.apple.com/us/album/x/123?i=456 ')?.service).toBe('apple');
    expect(parseMusicLink('spotify:track:4uLU6hMCjMI75M1A2tKUQC')?.service).toBe('spotify');
    expect(parseMusicLink('https://music.youtube.com/watch?v=abc')?.service).toBe('youtube');
  });

  it('turns down other links and plain text', () => {
    expect(parseMusicLink('https://example.com/song')).toBeNull();
    expect(parseMusicLink('my favourite song')).toBeNull();
  });
});
