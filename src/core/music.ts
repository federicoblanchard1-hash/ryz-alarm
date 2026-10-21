// Music links for "Morning music": a Spotify or Apple Music song, album or
// playlist that opens once you're up. Neither service lets another app use
// its songs as the alarm sound itself (the apps that try just launch Spotify
// and need it left open all night), so Ryz rings with its own sound or your
// own song file, then hands over to your music.

export type MusicService = 'spotify' | 'apple' | 'youtube' | 'deezer' | 'soundcloud';

export interface MusicLink {
  service: MusicService;
  url: string;
}

export const MUSIC_SERVICE_NAME: Record<MusicService, string> = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  youtube: 'YouTube Music',
  deezer: 'Deezer',
  soundcloud: 'SoundCloud',
};

const HOSTS: [RegExp, MusicService][] = [
  [/^(open|play)\.spotify\.com$/, 'spotify'],
  [/^spotify\.link$/, 'spotify'],
  [/^(music|itunes|geo\.music)\.apple\.com$/, 'apple'],
  [/^music\.youtube\.com$/, 'youtube'],
  [/^(www\.)?deezer\.com$|^deezer\.page\.link$|^link\.deezer\.com$/, 'deezer'],
  [/^(www\.|on\.|m\.)?soundcloud\.com$/, 'soundcloud'],
];

/** A link pasted from a music app's Share button, or null if it isn't one Ryz can open. Text around the link is ignored. */
export function parseMusicLink(text: string): MusicLink | null {
  const trimmed = text.trim();
  if (/^spotify:[a-z]+:[A-Za-z0-9]+/.test(trimmed)) return { service: 'spotify', url: trimmed.split(/\s/)[0] };
  const match = trimmed.match(/https?:\/\/[^\s]+/);
  if (!match) return null;
  let host: string;
  try {
    host = new URL(match[0]).hostname.toLowerCase();
  } catch {
    return null;
  }
  const found = HOSTS.find(([re]) => re.test(host));
  return found ? { service: found[1], url: match[0] } : null;
}
